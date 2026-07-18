import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

let player: AudioPlayer | null = null;

export function initSound() {
  try {
    setAudioModeAsync({ playsInSilentMode: true });
    player = createAudioPlayer(require('../assets/new-lead.wav'));
  } catch {
    /* ignore — נמשיך בלי צליל אם משהו נכשל */
  }
}

/** צליל "דינג" + רטט עדין כשנכנס ליד חדש. */
export function playNewLead() {
  try {
    if (player) {
      player.seekTo(0);
      player.play();
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    /* ignore */
  }
}
