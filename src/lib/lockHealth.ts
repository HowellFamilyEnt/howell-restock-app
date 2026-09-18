import { prisma } from "@/lib/prisma";
import { getSlackCredentials, getSlackLockAlertsChannelId } from "@/lib/settings";
import { postSlackMessage } from "@/lib/slack";
import { syncSeamLocks } from "@/lib/seamSync";

const OFFLINE_ALERT_THRESHOLD_MS = 30 * 60 * 1000;

// Run by the check-lock-health cron (every 15 min - see vercel.json).
// Resyncs every lock from Seam first (fresh online/battery snapshot),
// then walks each one: tracks how long it's been continuously offline
// and alerts once that crosses 30 minutes (never re-alerting for the
// same outage), and alerts once per new battery threshold crossed
// (30%, then 10%), resetting once it's back above 30% so a future drain
// alerts again. Each lock's alert state lives on the SeamLock row itself
// so this is safe to run as often as the cron schedule allows without
// double-posting.
export async function checkLockHealthAndAlert(): Promise<{ checked: number; alerts: number }> {
  await syncSeamLocks();

  const slack = await getSlackCredentials();
  const channelId = await getSlackLockAlertsChannelId();
  const canAlert = !!(slack && channelId);

  const locks = await prisma.seamLock.findMany({ where: { active: true } });
  let alerts = 0;
  const now = new Date();

  for (const lock of locks) {
    // Offline duration tracking.
    if (!lock.online) {
      const offlineSince = lock.offline_since ?? now;
      const justWentOffline = !lock.offline_since;
      const offlineForMs = now.getTime() - offlineSince.getTime();
      const shouldAlert = offlineForMs >= OFFLINE_ALERT_THRESHOLD_MS && !lock.offline_alert_sent;

      if (justWentOffline || shouldAlert) {
        await prisma.seamLock.update({
          where: { id: lock.id },
          data: {
            offline_since: offlineSince,
            offline_alert_sent: shouldAlert ? true : lock.offline_alert_sent,
          },
        });
      }

      if (shouldAlert && canAlert) {
        await postSlackMessage(
          slack!.botToken,
          channelId!,
          `🔴 *${lock.display_name}* has been offline for 30+ minutes.`
        ).catch(() => {});
        alerts++;
      }
    } else if (lock.offline_since || lock.offline_alert_sent) {
      // Back online - clear the outage state so a future one alerts fresh.
      await prisma.seamLock.update({
        where: { id: lock.id },
        data: { offline_since: null, offline_alert_sent: false },
      });
    }

    // Battery threshold tracking.
    if (lock.battery_level !== null) {
      const pct = lock.battery_level * 100;
      let newLevel = lock.battery_alert_level;

      if (pct < 10 && lock.battery_alert_level !== "below_10") {
        newLevel = "below_10";
        if (canAlert) {
          await postSlackMessage(
            slack!.botToken,
            channelId!,
            `🔋 *${lock.display_name}* battery is critically low: ${Math.round(pct)}%.`
          ).catch(() => {});
          alerts++;
        }
      } else if (pct < 30 && !lock.battery_alert_level) {
        newLevel = "below_30";
        if (canAlert) {
          await postSlackMessage(
            slack!.botToken,
            channelId!,
            `🔋 *${lock.display_name}* battery is getting low: ${Math.round(pct)}%.`
          ).catch(() => {});
          alerts++;
        }
      } else if (pct >= 30 && lock.battery_alert_level) {
        newLevel = null;
      }

      if (newLevel !== lock.battery_alert_level) {
        await prisma.seamLock.update({ where: { id: lock.id }, data: { battery_alert_level: newLevel } });
      }
    }
  }

  return { checked: locks.length, alerts };
}
