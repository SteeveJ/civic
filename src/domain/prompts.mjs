export const TONES = {
  diplomatic: 'diplomatique, chaleureux, très arrondi',
  professional: 'professionnel, neutre et clair',
  assertive: 'assertif : ferme, direct, sans agressivité',
  humor: "avec un humour subtil qui désamorce la tension",
  passive_aggressive: 'passif-agressif élégant : irréprochable en surface, piquant en dessous',
};
export const INTENSITIES = {
  franc: 'franc mais encore présentable',
  suffit: 'cash, sans filtre, agacé',
  nuclear: 'totalement sans filtre (reste drôle, jamais haineux ni discriminatoire)',
};
const LANG = { fr: 'français', en: 'anglais' };
export const MAX_CHARS = 4000;
export const KINDS = ['transform', 'reverse', 'antidote', 'bullshit_score'];

// Condensed from the humanizer skill (github.com/blader/humanizer): the full 32 KB file per request would be too slow and costly.
const HUMAN = `Écris comme une vraie personne, pas comme une IA :
- Dis les choses directement, sans phrase d'introduction ni conclusion creuse ou morale finale.
- Pas de « ce n'est pas X, c'est Y », pas de listes de trois par réflexe, pas de phrases qui commencent toutes pareil.
- Pas de tirets longs (— ou –) : utilise des virgules, des points ou des parenthèses.
- Pas de mots gonflés ni de jargon commercial (crucial, essentiel, incontournable, véritable, en effet, n'hésite pas à…).
- Pas d'empilement de précautions (peut-être, éventuellement, il semblerait que…), pas de gras ni de titres.
- Préfère « est », « a », la voix active et des sujets clairs.
- Rien sur toi-même ni sur la consigne (« Voici… », « J'espère que… »).`;

// Builds { system, json } for a mode, or throws a 400-style Error on bad input.
export function buildPrompt(kind, b) {
  const text = typeof b?.text === 'string' ? b.text.trim() : '';
  if (!text) throw new Error('Texte requis');
  if (text.length > MAX_CHARS) throw new Error(`Texte trop long (max ${MAX_CHARS})`);
  const lang = LANG[b.language] ? b.language : 'fr';
  const out = `Réponds uniquement en ${LANG[lang]}. ${HUMAN}`;

  if (kind === 'transform') {
    if (!TONES[b.tone]) throw new Error('Ton invalide');
    if (!['reformulate', 'reply'].includes(b.mode)) throw new Error('Mode invalide');
    const d = Math.min(100, Math.max(0, Number(b.diplomacy) || 50));
    const task = b.mode === 'reply'
      ? "Le texte est un message reçu d'un collègue. Écris la réponse que l'utilisateur peut envoyer."
      : "Le texte est ce que l'utilisateur pense vraiment. Réécris-le en un message envoyable qui garde le fond.";
    return { text, json: false, system:
      `Tu aides à communiquer au travail. ${task} Ton : ${TONES[b.tone]}. Niveau de diplomatie ${d}/100 (0 = très direct, 100 = langue de bois parfaite). ${out} Rends seulement le message final, sans commentaire.` };
  }
  if (kind === 'reverse') {
    const i = INTENSITIES[b.intensity] ? b.intensity : 'suffit';
    return { text, json: false, system:
      `Le texte est un message poli de bureau. Écris ce que l'auteur pensait vraiment, sur un ton ${INTENSITIES[i]}. ${out} Rends seulement ce texte.` };
  }
  if (kind === 'antidote') {
    return { text, json: true, system:
      `Le texte est rempli de jargon corporate. Traduis-le en langage humain simple. ${out} Rends uniquement du JSON : {"translation": string, "terms": [{"jargon": string, "meaning": string}]}` };
  }
  if (kind === 'bullshit_score') {
    return { text, json: true, system:
      `Évalue le taux de jargon creux du texte. ${out} Rends uniquement du JSON : {"score": entier 0-100, "verdict": phrase courte et drôle, "buzzwords": [string]}` };
  }
  throw new Error('Mode inconnu');
}

// The model sometimes wraps JSON in ``` fences or adds a sentence around it.
export function extractJson(s) {
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('llm_parse_error');
  try { return JSON.parse(m[0]); } catch { throw new Error('llm_parse_error'); }
}

