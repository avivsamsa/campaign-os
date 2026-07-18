import { useEffect } from 'react';
import { onNewLeads } from '../lib/data';
import { initSound, playNewLead } from '../lib/sound';

/** רכיב בלתי-נראה — רושם צליל+רטט להאזנה ללידים חדשים מהמאגר. */
export function NewLeadAlert() {
  useEffect(() => {
    initSound();
    onNewLeads(() => playNewLead());
    return () => onNewLeads(null);
  }, []);
  return null;
}
