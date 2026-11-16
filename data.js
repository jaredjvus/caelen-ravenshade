// Static build data: level table, spells, features, gear library.
// Loaded before app.js; everything here is plain top-level declarations.
// ============================================================
// BUILD DATA — single source of truth
// ============================================================

// Pure 27-point-buy row (max 15 per score). The background bonuses below
// bring CHA to 17 and CON to 15 at character level 1.
//   PB cost: 0 (STR 8) + 7 (DEX 14) + 7 (CON 14) + 2 (INT 10) + 2 (WIS 10) + 9 (CHA 15) = 27.
const BASE_STATS = { str: 8, dex: 14, con: 14, int: 10, wis: 10, cha: 15 };
// Custom Entertainer background bonuses (DM-approved): +2 CHA, +1 CON.
const BG_BONUS = { cha: 2, con: 1 };

// Per-level data. Each entry describes the CHANGES at that level.
// Stat increases (asi) are CUMULATIVE.
const LEVEL_DATA = [
  null, // padding so index = level
  // L1
  { warlock: 1, sorcerer: 0, classGain: 'Pact Magic, Hexblade\'s Curse, Hex Warrior, Eldritch Blast; Eldritch Invocation: Agonizing Blast; Musician (Entertainer Origin Feat)', subclass: 'Hexblade' },
  // L2
  { warlock: 2, sorcerer: 0, classGain: 'Magical Cunning; +2 Eldritch Invocations: Repelling Blast, Devil\'s Sight' },
  // L3
  { warlock: 3, sorcerer: 0, classGain: 'Pact of the Chain (summon Vex, imp familiar)' },
  // L4
  { warlock: 4, sorcerer: 0, classGain: 'Feat; +1 Warlock cantrip: Mind Sliver',
    feat: {
      id: 'lvl4-feat',
      label: 'Level 4 Feat',
      options: [
        { id: 'inspiring', name: 'Inspiring Leader', effect: 'After a 10-minute rest, you and up to 5 allies who hear your speech gain temp HP = level + CHA mod.' },
        { id: 'warcaster', name: 'War Caster', effect: 'Advantage on concentration saves. Cast spells as opportunity attacks. Somatic components with hands full.' }
      ],
      default: 'inspiring'
    }
  },
  // L5
  { warlock: 4, sorcerer: 1, classGain: 'Innate Sorcery, Sorcerer spellcasting; Eldritch Blast scales to 2 beams' },
  // L6
  { warlock: 4, sorcerer: 2, classGain: 'Font of Magic (sorcery points), Metamagic: Quickened Spell + Subtle Spell' },
  // L7
  { warlock: 4, sorcerer: 3, classGain: 'Sorcerous Origin: Wild Magic — Wild Magic Surge + Tides of Chaos', subclass2: 'Wild Magic' },
  // L8
  { warlock: 4, sorcerer: 4, classGain: 'Feat; +1 Sorcerer cantrip: Sorcerous Burst',
    feat: {
      id: 'lvl8-feat',
      label: 'Level 8 Feat',
      options: [
        { id: 'resilient-con', name: 'Resilient (CON)', effect: '+1 CON, gain Constitution save proficiency — locks in concentration.', asi: { con: 1 }, saveProf: 'con' },
        { id: 'speedy', name: 'Speedy', effect: '+10 ft walking speed, ignore difficult terrain caused by spells, +1 DEX.', asi: { dex: 1 } }
      ],
      default: 'resilient-con'
    }
  },
  // L9
  { warlock: 4, sorcerer: 5, classGain: 'Sorcerous Restoration; 3rd-level spells: Counterspell, Fireball, Hypnotic Pattern, Fly' },
  // L10
  { warlock: 4, sorcerer: 6, classGain: 'Wild Magic: Bend Luck — spend 2 sorcery points to add or subtract a d4 from any roll within 30 ft' },
  // L11
  { warlock: 4, sorcerer: 7, classGain: 'Sorcery Incarnate; Eldritch Blast scales to 3 beams; 4th-level spells: Greater Invisibility, Polymorph' },
  // L12
  { warlock: 4, sorcerer: 8, classGain: 'ASI: CHA 19', asi: { cha: 2 } },
  // L13
  { warlock: 4, sorcerer: 9, classGain: '5th-level spells: Wall of Force, Synaptic Static' },
  // L14
  { warlock: 4, sorcerer: 10, classGain: '+1 Metamagic option (3rd total); +1 Sorcerer cantrip: Message',
    feat: {
      id: 'lvl14-metamagic',
      label: 'Level 14 Metamagic — 3rd option',
      options: [
        { id: 'careful', name: 'Careful Spell', effect: '1 SP — up to CHA mod creatures auto-succeed the save (and take no half-damage) against your own AoE spell.' },
        { id: 'distant', name: 'Distant Spell', effect: '1 SP — double a spell\'s range (Touch → 30 ft).' },
        { id: 'empowered', name: 'Empowered Spell', effect: '1 SP — reroll damage dice up to CHA mod count; stacks with another Metamagic option.' },
        { id: 'extended', name: 'Extended Spell', effect: '1 SP — double a duration of 1 minute+ (max 24 hours).' },
        { id: 'heightened', name: 'Heightened Spell', effect: '3 SP — one target has Disadvantage on its first save against the spell.' },
        { id: 'seeking', name: 'Seeking Spell', effect: '1 SP — reroll a missed spell attack roll (once per casting).' },
        { id: 'twinned', name: 'Twinned Spell', effect: 'SP = spell level (min 1) — target a second creature with a single-target spell.' }
      ],
      default: 'twinned'
    }
  },
  // L15
  { warlock: 4, sorcerer: 11, classGain: '6th-level spells: Disintegrate, Chain Lightning' },
  // L16
  { warlock: 4, sorcerer: 12, classGain: 'Feat',
    feat: {
      id: 'lvl16-feat',
      label: 'Level 16 Feat',
      options: [
        { id: 'warcaster16', name: 'War Caster', effect: 'Advantage on concentration saves, somatic components with hands full.' },
        { id: 'lucky', name: 'Lucky', effect: '3 Luck Points per long rest, reroll attacks/saves/checks or force enemies to reroll.' },
        { id: 'asi-cha-con', name: 'ASI: +1 CHA / +1 CON', effect: 'Boring but boring works.', asi: { cha: 1, con: 1 } }
      ],
      default: 'warcaster16'
    }
  },
  // L17
  { warlock: 4, sorcerer: 13, classGain: '7th-level spells; Eldritch Blast scales to 4 beams' },
  // L18
  { warlock: 4, sorcerer: 14, classGain: 'Wild Magic: Controlled Chaos' },
  // L19
  { warlock: 4, sorcerer: 15, classGain: 'Dead level — no new class or subclass feature. 8th-level spell slot unlocks; prepared spells count increases.' },
  // L20
  { warlock: 4, sorcerer: 16, classGain: 'ASI / Feat (final character level)', asi: { con: 2 } }
];

// Spell scaling: when each spell is gained (charLevel)
const SPELLS = [
  // Cantrips
  { name: 'Eldritch Blast', level: 'Cantrip', class: 'Warlock', gained: 1, notes: 'The Engine. Force damage, 120 ft, ranged spell attack.' },
  { name: 'Light', level: 'Cantrip', class: 'Aasimar', gained: 1, notes: 'Touch object, sheds bright light 20 ft.' },
  { name: 'Prestidigitation', level: 'Cantrip', class: 'Warlock', gained: 1, notes: 'Minor magical effects. Tuning strings, lighting candles.' },
  { name: 'Mind Sliver', level: 'Cantrip', class: 'Warlock', gained: 4, notes: '1d6 psychic; target has −1d4 on its next save before end of your next turn.' },
  { name: 'Mage Hand', level: 'Cantrip', class: 'Sorcerer', gained: 5, notes: 'Spectral floating hand. 30 ft range.' },
  { name: 'Minor Illusion', level: 'Cantrip', class: 'Sorcerer', gained: 5, notes: 'Sound or image, 1 minute.' },
  { name: 'Elementalism', level: 'Cantrip', class: 'Sorcerer', gained: 5, notes: 'Manipulate earth, water, fire, or air — minor elemental tricks. 2024 PHB consolidation of the old elemental cantrips.' },
  { name: 'Thunderclap', level: 'Cantrip', class: 'Sorcerer', gained: 5, notes: 'Self (5-ft radius). 1d6 thunder, CON save half. Audible up to 100 ft. Scales with character level.' },
  { name: 'Sorcerous Burst', level: 'Cantrip', class: 'Sorcerer', gained: 8, notes: '1d8 force; chains an additional d8 on each max roll.' },
  { name: 'Message', level: 'Cantrip', class: 'Sorcerer', gained: 14, notes: 'Whispered telepathic message + reply, 120 ft.' },
  // 1st level
  { name: 'Hex', level: '1st', class: 'Warlock', gained: 1, concentration: true, notes: 'Bonus action. 1d6 necrotic on hits. Moves to new target when current drops.' },
  { name: "Tasha's Hideous Laughter", level: '1st', class: 'Warlock', gained: 1, concentration: true, notes: 'WIS save, target prone and incapacitated on fail.' },
  { name: 'Find Familiar', level: '1st', class: 'Pact of the Chain', gained: 3, notes: 'Summons Vex, an imp. Full stat block: Engine section → "Familiar — Vex".' },
  { name: 'Shield', level: '1st', class: 'Hexblade', gained: 1, notes: '+5 AC reaction, no damage from Magic Missile.' },
  { name: 'Magic Missile', level: '1st', class: 'Sorcerer', gained: 5, notes: 'Three force darts, auto-hit, 1d4+1 each.' },
  { name: 'Bane', level: '1st', class: 'Warlock', gained: 5, concentration: true, notes: 'Up to 3 targets within 30 ft, CHA save or -1d4 to attacks and saves for 1 min. Boosts every control spell.' },
  { name: 'Hellish Rebuke', level: '1st', class: 'Warlock', gained: 5, notes: 'Reaction after taking damage: 2d10 fire on the attacker (DEX save half). Upcastable for +1d10 per slot.' },
  // 2nd level
  { name: 'Mirror Image', level: '2nd', class: 'Warlock', gained: 5, notes: 'Three duplicates, attackers may hit a duplicate instead.' },
  { name: 'Misty Step', level: '2nd', class: 'Sorcerer', gained: 7, notes: 'Bonus action teleport 30 ft.' },
  { name: 'Suggestion', level: '2nd', class: 'Warlock', gained: 3, concentration: true, notes: 'WIS save, target follows reasonable command for up to 8 hours.' },
  // 3rd level
  { name: 'Counterspell', level: '3rd', class: 'Sorcerer', gained: 9, notes: 'Reaction: shut down enemy spell up to 3rd level automatically.' },
  { name: 'Fireball', level: '3rd', class: 'Sorcerer', gained: 9, notes: '8d6 fire, 20 ft radius, DEX save half.' },
  { name: 'Hypnotic Pattern', level: '3rd', class: 'Sorcerer', gained: 9, concentration: true, notes: 'WIS save, charm + incapacitate in 30 ft cube.' },
  { name: 'Fly', level: '3rd', class: 'Sorcerer', gained: 9, concentration: true, notes: '60 ft fly speed, concentration, 10 min.' },
  // 4th
  { name: 'Greater Invisibility', level: '4th', class: 'Sorcerer', gained: 11, concentration: true, notes: 'Invisible while concentrating. Advantage on attacks.' },
  { name: 'Polymorph', level: '4th', class: 'Sorcerer', gained: 11, concentration: true, notes: 'Transform creature into a beast. 1 hour.' },
  // 5th
  { name: 'Wall of Force', level: '5th', class: 'Sorcerer', gained: 13, concentration: true, notes: 'Invisible wall, blocks everything for 10 min.' },
  { name: 'Synaptic Static', level: '5th', class: 'Sorcerer', gained: 13, notes: '8d6 psychic in 20 ft radius, INT save half + −1d6 to attacks/checks.' },
  // 6th
  { name: 'Disintegrate', level: '6th', class: 'Sorcerer', gained: 15, notes: '10d6+40 force damage, target turned to dust if killed.' },
  { name: 'Chain Lightning', level: '6th', class: 'Sorcerer', gained: 15, notes: '10d8 lightning, primary + 3 secondary targets.' },
  // 7th
  { name: 'Forcecage', level: '7th', class: 'Sorcerer', gained: 17, notes: 'Inescapable box of force, 1 hour.' },
  { name: 'Plane Shift', level: '7th', class: 'Sorcerer', gained: 17, notes: 'Travel to another plane or banish creature.' },
  // 8th
  { name: 'Sunburst', level: '8th', class: 'Sorcerer', gained: 18, notes: '12d6 radiant in 60 ft radius, blinds on fail.' },
  // 9th
  { name: 'Mind Blank', level: '8th', class: 'Sorcerer', gained: 20, notes: 'Target is immune to charm, fear, possession, divination, and psychic damage for 8 hours.' }
];

// Full spell descriptions (2024 PHB) — used by the spell info modal.
const SPELL_DETAILS = {
  'Bane': {
    schoolClass: 'Level 1 Enchantment (Bard, Cleric, Warlock)',
    time: 'Action',
    range: '30 feet',
    components: 'V, S, M (a drop of blood)',
    duration: 'Concentration, up to 1 minute',
    desc: 'Up to three creatures of your choice that you can see within range must each make a Charisma saving throw. Whenever a target that fails this save makes an attack roll or a saving throw before the spell ends, the target must subtract 1d4 from the attack roll or save.\n\nUsing a Higher-Level Spell Slot. You can target one additional creature for each spell slot level above 1.'
  },
  'Chain Lightning': {
    schoolClass: 'Level 6 Evocation (Sorcerer, Wizard)',
    time: 'Action',
    range: '150 feet',
    components: 'V, S, M (three silver pins)',
    duration: 'Instantaneous',
    desc: 'You launch a lightning bolt toward a target you can see within range. Three bolts then leap from that target to as many as three other targets of your choice, each of which must be within 30 feet of the first target. A target can be a creature or an object and can be targeted by only one of the bolts.\n\nEach target makes a Dexterity saving throw, taking 10d8 Lightning damage on a failed save or half as much damage on a successful one.\n\nUsing a Higher-Level Spell Slot. One additional bolt leaps from the first target to another target for each spell slot level above 6.'
  },
  'Counterspell': {
    schoolClass: 'Level 3 Abjuration (Sorcerer, Warlock, Wizard)',
    time: 'Reaction, which you take when you see a creature within 60 feet of yourself casting a spell with Verbal, Somatic, or Material components',
    range: '60 feet',
    components: 'S',
    duration: 'Instantaneous',
    desc: 'You attempt to interrupt a creature in the process of casting a spell. The creature makes a Constitution saving throw. On a failed save, the spell dissipates with no effect, and the action, Bonus Action, or Reaction used to cast it is wasted. If that spell was cast with a spell slot, the slot isn’t expended.'
  },
  'Disintegrate': {
    schoolClass: 'Level 6 Transmutation (Sorcerer, Wizard)',
    time: 'Action',
    range: '60 feet',
    components: 'V, S, M (a lodestone and dust)',
    duration: 'Instantaneous',
    desc: 'You launch a green ray at a target you can see within range. The target can be a creature, a nonmagical object, or a creation of magical force, such as the wall created by Wall of Force.\n\nA creature targeted by this spell makes a Dexterity saving throw. On a failed save, the target takes 10d6 + 40 Force damage. If this damage reduces it to 0 Hit Points, it and everything nonmagical it is wearing and carrying are disintegrated into gray dust. The target can be revived only by a True Resurrection or a Wish spell.\n\nThis spell automatically disintegrates a Large or smaller nonmagical object or a creation of magical force. If such a target is Huge or larger, this spell disintegrates a 10-foot-Cube portion of it.\n\nUsing a Higher-Level Spell Slot. The damage increases by 3d6 for each spell slot level above 6.'
  },
  'Eldritch Blast': {
    schoolClass: 'Evocation Cantrip (Warlock)',
    time: 'Action',
    range: '120 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    desc: 'You hurl a beam of crackling energy. Make a ranged spell attack against one creature or object in range. On a hit, the target takes 1d10 Force damage.\n\nCantrip Upgrade. The spell creates two beams at level 5, three beams at level 11, and four beams at level 17. You can direct the beams at the same target or at different ones. Make a separate attack roll for each beam.'
  },
  'Elementalism': {
    schoolClass: 'Transmutation Cantrip (Artificer, Druid, Sorcerer, Wizard)',
    time: 'Action',
    range: '30 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    desc: 'You exert control over the elements, creating one of the following effects within range.\n\nBeckon Air. You create a breeze strong enough to ripple cloth, stir dust, rustle leaves, and close open doors and shutters, all in a 5-foot Cube. Doors and shutters being held open by someone or something aren’t affected.\n\nBeckon Earth. You create a thin shroud of dust or sand that covers surfaces in a 5-foot-square area, or you cause a single word to appear in your handwriting in a patch of dirt or sand.\n\nBeckon Fire. You create a thin cloud of harmless embers and colored, scented smoke in a 5-foot Cube. You choose the color and scent, and the embers can light candles, torches, or lamps in that area. The smoke’s scent lingers for 1 minute.\n\nBeckon Water. You create a spray of cool mist that lightly dampens creatures and objects in a 5-foot Cube. Alternatively, you create 1 cup of clean water either in an open container or on a surface, and the water evaporates in 1 minute.\n\nSculpt Element. You cause dirt, sand, fire, smoke, mist, or water that can fit in a 1-foot Cube to assume a crude shape (such as that of a creature) for 1 hour.'
  },
  'Find Familiar': {
    schoolClass: 'Level 1 Conjuration (Wizard)',
    time: '1 hour or Ritual',
    range: '10 feet',
    components: 'V, S, M (burning incense worth 10+ GP, which the spell consumes)',
    duration: 'Instantaneous',
    desc: 'You gain the service of a familiar, a spirit that takes an animal form you choose: Bat, Cat, Frog, Hawk, Lizard, Octopus, Owl, Rat, Raven, Spider, Weasel, or another Beast that has a Challenge Rating of 0. Appearing in an unoccupied space within range, the familiar has the statistics of the chosen form (see appendix B), though it is a Celestial, Fey, or Fiend (your choice) instead of a Beast. Your familiar acts independently of you, but it obeys your commands.\n\nTelepathic Connection. While your familiar is within 100 feet of you, you can communicate with it telepathically. Additionally, as a Bonus Action, you can see through the familiar’s eyes and hear what it hears until the start of your next turn, gaining the benefits of any special senses it has.\n\nFinally, when you cast a spell with a range of touch, your familiar can deliver the touch. Your familiar must be within 100 feet of you, and it must take a Reaction to deliver the touch when you cast the spell.\n\nCombat. The familiar is an ally to you and your allies. It rolls its own Initiative and acts on its own turn. A familiar can’t attack, but it can take other actions as normal.\n\nDisappearance of the Familiar. When the familiar drops to 0 Hit Points, it disappears. It reappears after you cast this spell again. As a Magic action, you can temporarily dismiss the familiar to a pocket dimension. Alternatively, you can dismiss it forever. As a Magic action while it is temporarily dismissed, you can cause it to reappear in an unoccupied space within 30 feet of you. Whenever the familiar drops to 0 Hit Points or disappears into the pocket dimension, it leaves behind in its space anything it was wearing or carrying.\n\nOne Familiar Only. You can’t have more than one familiar at a time. If you cast this spell while you have a familiar, you instead cause it to adopt a new eligible form.'
  },
  'Fireball': {
    schoolClass: 'Level 3 Evocation (Sorcerer, Wizard)',
    time: 'Action',
    range: '150 feet',
    components: 'V, S, M (a ball of bat guano and sulfur)',
    duration: 'Instantaneous',
    desc: 'A bright streak flashes from you to a point you choose within range and then blossoms with a low roar into a fiery explosion. Each creature in a 20-foot-radius Sphere centered on that point makes a Dexterity saving throw, taking 8d6 Fire damage on a failed save or half as much damage on a successful one.\n\nFlammable objects in the area that aren’t being worn or carried start burning.\n\nUsing a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 3.'
  },
  'Fly': {
    schoolClass: 'Level 3 Transmutation (Artificer, Sorcerer, Warlock, Wizard)',
    time: 'Action',
    range: 'Touch',
    components: 'V, S, M (a feather)',
    duration: 'Concentration, up to 10 minutes',
    desc: 'You touch a willing creature. For the duration, the target gains a Fly Speed of 60 feet and can hover. When the spell ends, the target falls if it is still aloft unless it can stop the fall.\n\nUsing a Higher-Level Spell Slot. You can target one additional creature for each spell slot level above 3.'
  },
  'Forcecage': {
    schoolClass: 'Level 7 Evocation (Bard, Warlock, Wizard)',
    time: 'Action',
    range: '100 feet',
    components: 'V, S, M (ruby dust worth 1,500+ GP, which the spell consumes)',
    duration: 'Concentration, up to 1 hour',
    desc: 'An immobile, Invisible, Cube-shaped prison composed of magical force springs into existence around an area you choose within range. The prison can be a cage or a solid box, as you choose.\n\nA prison in the shape of a cage can be up to 20 feet on a side and is made from 1/2-inch diameter bars spaced 1/2 inch apart. A prison in the shape of a box can be up to 10 feet on a side, creating a solid barrier that prevents any matter from passing through it and blocking any spells cast into or out from the area.\n\nWhen you cast the spell, any creature that is completely inside the cage’s area is trapped. Creatures only partially within the area, or those too large to fit inside it, are pushed away from the center of the area until they are completely outside it.\n\nA creature inside the cage can’t leave it by nonmagical means. If the creature tries to use teleportation or interplanar travel to leave, it must first make a Charisma saving throw. On a successful save, the creature can use that magic to exit the cage. On a failed save, the creature doesn’t exit the cage and wastes the spell or effect. The cage also extends into the Ethereal Plane, blocking ethereal travel.\n\nThis spell can’t be dispelled by Dispel Magic.'
  },
  'Greater Invisibility': {
    schoolClass: 'Level 4 Illusion (Bard, Sorcerer, Wizard)',
    time: 'Action',
    range: 'Touch',
    components: 'V, S',
    duration: 'Concentration, up to 1 minute',
    desc: 'A creature you touch has the Invisible condition until the spell ends.'
  },
  'Hellish Rebuke': {
    schoolClass: 'Level 1 Evocation (Warlock)',
    time: 'Reaction, which you take in response to taking damage from a creature that you can see within 60 feet of yourself',
    range: '60 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    desc: 'The creature that damaged you is momentarily surrounded by green flames. It makes a Dexterity saving throw, taking 2d10 Fire damage on a failed save or half as much damage on a successful one.\n\nUsing a Higher-Level Spell Slot. The damage increases by 1d10 for each spell slot level above 1.'
  },
  'Hex': {
    schoolClass: 'Level 1 Enchantment (Warlock)',
    time: 'Bonus Action',
    range: '90 feet',
    components: 'V, S, M (the petrified eye of a newt)',
    duration: 'Concentration, up to 1 hour',
    desc: 'You place a curse on a creature that you can see within range. Until the spell ends, you deal an extra 1d6 Necrotic damage to the target whenever you hit it with an attack roll. Also, choose one ability when you cast the spell. The target has Disadvantage on ability checks made with the chosen ability.\n\nIf the target drops to 0 Hit Points before this spell ends, you can take a Bonus Action on a later turn to curse a new creature.\n\nUsing a Higher-Level Spell Slot. Your Concentration can last longer with a spell slot of level 2 (up to 4 hours), 3–4 (up to 8 hours), or 5+ (24 hours).'
  },
  'Hypnotic Pattern': {
    schoolClass: 'Level 3 Illusion (Bard, Sorcerer, Warlock, Wizard)',
    time: 'Action',
    range: '120 feet',
    components: 'S, M (a pinch of confetti)',
    duration: 'Concentration, up to 1 minute',
    desc: 'You create a twisting pattern of colors in a 30-foot Cube within range. The pattern appears for a moment and vanishes. Each creature in the area who can see the pattern must succeed on a Wisdom saving throw or have the Charmed condition for the duration. While Charmed, the creature has the Incapacitated condition and a Speed of 0.\n\nThe spell ends for an affected creature if it takes any damage or if someone else uses an action to shake the creature out of its stupor.'
  },
  'Light': {
    schoolClass: 'Evocation Cantrip (Artificer, Bard, Cleric, Sorcerer, Wizard)',
    time: 'Action',
    range: 'Touch',
    components: 'V, M (a firefly or phosphorescent moss)',
    duration: '1 hour',
    desc: 'You touch one Large or smaller object that isn’t being worn or carried by someone else. Until the spell ends, the object sheds Bright Light in a 20-foot radius and Dim Light for an additional 20 feet. The light can be colored as you like.\n\nCovering the object with something opaque blocks the light. The spell ends if you cast it again.'
  },
  'Mage Hand': {
    schoolClass: 'Conjuration Cantrip (Artificer, Bard, Sorcerer, Warlock, Wizard)',
    time: 'Action',
    range: '30 feet',
    components: 'V, S',
    duration: '1 minute',
    desc: 'A spectral, floating hand appears at a point you choose within range. The hand lasts for the duration. The hand vanishes if it is ever more than 30 feet away from you or if you cast this spell again.\n\nWhen you cast the spell, you can use the hand to manipulate an object, open an unlocked door or container, stow or retrieve an item from an open container, or pour the contents out of a vial.\n\nAs a Magic action on your later turns, you can control the hand thus again. As part of that action, you can move the hand up to 30 feet.\n\nThe hand can’t attack, activate magic items, or carry more than 10 pounds.'
  },
  'Magic Missile': {
    schoolClass: 'Level 1 Evocation (Sorcerer, Wizard)',
    time: 'Action',
    range: '120 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    desc: 'You create three glowing darts of magical force. Each dart strikes a creature of your choice that you can see within range. A dart deals 1d4 + 1 Force damage to its target. The darts all strike simultaneously, and you can direct them to hit one creature or several.\n\nUsing a Higher-Level Spell Slot. The spell creates one more dart for each spell slot level above 1.'
  },
  'Message': {
    schoolClass: 'Transmutation Cantrip (Artificer, Bard, Druid, Sorcerer, Wizard)',
    time: 'Action',
    range: '120 feet',
    components: 'S, M (a copper wire)',
    duration: '1 round',
    desc: 'You point toward a creature within range and whisper a message. The target (and only the target) hears the message and can reply in a whisper that only you can hear.\n\nYou can cast this spell through solid objects if you are familiar with the target and know it is beyond the barrier. Magical silence; 1 foot of stone, metal, or wood; or a thin sheet of lead blocks the spell.'
  },
  'Mind Blank': {
    schoolClass: 'Level 8 Abjuration (Bard, Wizard)',
    time: 'Action',
    range: 'Touch',
    components: 'V, S',
    duration: '24 hours',
    desc: 'Until the spell ends, one willing creature you touch has Immunity to Psychic damage and the Charmed condition. The target is also unaffected by anything that would sense its emotions or alignment, read its thoughts, or magically detect its location, and no spell - not even Wish - can gather information about the target, observe it remotely, or control its mind.'
  },
  'Mind Sliver': {
    schoolClass: 'Enchantment Cantrip (Sorcerer, Warlock, Wizard)',
    time: 'Action',
    range: '60 feet',
    components: 'V',
    duration: '1 round',
    desc: 'You try to temporarily sliver the mind of one creature you can see within range. The target must succeed on an Intelligence saving throw or take 1d6 Psychic damage and subtract 1d4 from the next saving throw it makes before the end of your next turn.\n\nCantrip Upgrade. The damage increases by 1d6 when you reach levels 5 (2d6), 11 (3d6), and 17 (4d6).'
  },
  'Minor Illusion': {
    schoolClass: 'Illusion Cantrip (Bard, Sorcerer, Warlock, Wizard)',
    time: 'Action',
    range: '30 feet',
    components: 'S, M (a bit of fleece)',
    duration: '1 minute',
    desc: 'You create a sound or an image of an object within range that lasts for the duration. See the descriptions below for the effects of each. The illusion ends if you cast this spell again.\n\nIf a creature takes a Study action to examine the sound or image, the creature can determine that it is an illusion with a successful Intelligence (Investigation) check against your spell save DC. If a creature discerns the illusion for what it is, the illusion becomes faint to the creature.\n\nSound. If you create a sound, its volume can range from a whisper to a scream. It can be your voice, someone else’s voice, a lion’s roar, a beating of drums, or any other sound you choose. The sound continues unabated throughout the duration, or you can make discrete sounds at different times before the spell ends.\n\nImage. If you create an image of an object—such as a chair, muddy footprints, or a small chest—it must be no larger than a 5-foot Cube. The image can’t create sound, light, smell, or any other sensory effect. Physical interaction with the image reveals it to be an illusion, since things can pass through it.'
  },
  'Mirror Image': {
    schoolClass: 'Level 2 Illusion (Bard, Sorcerer, Warlock, Wizard)',
    time: 'Action',
    range: 'Self',
    components: 'V, S',
    duration: '1 minute',
    desc: 'Three illusory duplicates of yourself appear in your space. Until the spell ends, the duplicates move with you and mimic your actions, shifting position so it’s impossible to track which image is real.\n\nEach time a creature hits you with an attack roll during the spell’s duration, roll a d6 for each of your remaining duplicates. If any of the d6s rolls a 3 or higher, one of the duplicates is hit instead of you, and the duplicate is destroyed. The duplicates otherwise ignore all other damage and effects. The spell ends when all three duplicates are destroyed.\n\nA creature is unaffected by this spell if it has the Blinded condition, Blindsight, or Truesight.'
  },
  'Misty Step': {
    schoolClass: 'Level 2 Conjuration (Sorcerer, Warlock, Wizard)',
    time: 'Bonus Action',
    range: 'Self',
    components: 'V',
    duration: 'Instantaneous',
    desc: 'Briefly surrounded by silvery mist, you teleport up to 30 feet to an unoccupied space you can see.'
  },
  'Plane Shift': {
    schoolClass: 'Level 7 Conjuration (Cleric, Druid, Sorcerer, Warlock, Wizard)',
    time: 'Action',
    range: 'Touch',
    components: 'V, S, M (a forked, metal rod worth 250+ GP and attuned to a plane of existence)',
    duration: 'Instantaneous',
    desc: 'You and up to eight willing creatures who link hands in a circle are transported to a different plane of existence. You can specify a target destination in general terms, such as the City of Brass on the Elemental Plane of Fire or the palace of Dispater on the second level of the Nine Hells, and you appear in or near that destination, as determined by the DM.\n\nAlternatively, if you know the sigil sequence of a teleportation circle on another plane of existence, this spell can take you to that circle. If the teleportation circle is too small to hold all the creatures you transported, they appear in the closest unoccupied spaces next to the circle.'
  },
  'Polymorph': {
    schoolClass: 'Level 4 Transmutation (Bard, Druid, Sorcerer, Wizard)',
    time: 'Action',
    range: '60 feet',
    components: 'V, S, M (a caterpillar cocoon)',
    duration: 'Concentration, up to 1 hour',
    desc: 'You attempt to transform a creature that you can see within range into a Beast. The target must succeed on a Wisdom saving throw or shape-shift into a Beast form for the duration. That form can be any Beast you choose that has a Challenge Rating equal to or less than the target\'s (or the target\'s level if it doesn\'t have a Challenge Rating). The target\'s game statistics are replaced by the stat block of the chosen Beast, but the target retains its alignment, personality, creature type, Hit Points, and Hit Point Dice. See appendix B for a sample of Beast stat blocks.\n\nThe target gains a number of Temporary Hit Points equal to the Hit Points of the Beast form. These Temporary Hit Points vanish if any remain when the spell ends. The spell ends early on the target if it has no Temporary Hit Points left.\n\nThe target is limited in the actions it can perform by the anatomy of its new form, and it can’t speak or cast spells.\n\nThe target\'s gear melds into the new form. The creature can\'t use or otherwise benefit from any of that equipment.'
  },
  'Prestidigitation': {
    schoolClass: 'Transmutation Cantrip (Artificer, Bard, Sorcerer, Warlock, Wizard)',
    time: 'Action',
    range: '10 feet',
    components: 'V, S',
    duration: 'Up to 1 hour',
    desc: 'You create a magical effect within range. Choose the effect from the options below. If you cast this spell multiple times, you can have up to three of its non-instantaneous effects active at a time.\n\nSensory Effect. You create an instantaneous, harmless sensory effect, such as a shower of sparks, a puff of wind, faint musical notes, or an odd odor.\n\nFire Play. You instantaneously light or snuff out a candle, a torch, or a small campfire.\n\nClean or Soil. You instantaneously clean or soil an object no larger than 1 cubic foot.\n\nMinor Sensation. You chill, warm, or flavor up to 1 cubic foot of nonliving material for 1 hour.\n\nMagic Mark. You make a color, a small mark, or a symbol appear on an object or a surface for 1 hour.\n\nMinor Creation. You create a nonmagical trinket or an illusory image that can fit in your hand. It lasts until the end of your next turn. A trinket can deal no damage and has no monetary worth.'
  },
  'Shield': {
    schoolClass: 'Level 1 Abjuration (Sorcerer, Wizard)',
    time: 'Reaction, which you take when you are hit by an attack roll or targeted by the Magic Missile spell',
    range: 'Self',
    components: 'V, S',
    duration: '1 round',
    desc: 'An imperceptible barrier of magical force protects you. Until the start of your next turn, you have a +5 bonus to AC, including against the triggering attack, and you take no damage from Magic Missile.'
  },
  'Sorcerous Burst': {
    schoolClass: 'Evocation Cantrip (Sorcerer)',
    time: 'Action',
    range: '120 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    desc: 'You cast sorcerous energy at one creature or object within range. Make a ranged spell attack against the target. On a hit, the target takes 1d8 damage of a type you choose: Acid, Cold, Fire, Lightning, Poison, Psychic, or Thunder.\n\nIf you roll an 8 on a d8 for this spell, you can roll another d8, and add it to the damage. When you cast this spell, the maximum number of these d8s you can add to the spell’s damage equals your spellcasting ability modifier.\n\nCantrip Upgrade. The damage increases by 1d8 when you reach levels 5 (2d8), 11 (3d8), and 17 (4d8).'
  },
  'Suggestion': {
    schoolClass: 'Level 2 Enchantment (Bard, Sorcerer, Warlock, Wizard)',
    time: 'Action',
    range: '30 feet',
    components: 'V, M (a drop of honey)',
    duration: 'Concentration, up to 8 hours',
    desc: 'You suggest a course of activity—described in no more than 25 words—to one creature you can see within range that can hear and understand you. The suggestion must sound achievable and not involve anything that would obviously deal damage to the target or its allies. For example, you could say, “Fetch the key to the cult’s treasure vault, and give the key to me.” Or you could say, “Stop fighting, leave this library peacefully, and don’t return.”\n\nThe target must succeed on a Wisdom saving throw or have the Charmed condition for the duration or until you or your allies deal damage to the target. The Charmed target pursues the suggestion to the best of its ability. The suggested activity can continue for the entire duration, but if the suggested activity can be completed in a shorter time, the spell ends for the target upon completing it.'
  },
  'Sunburst': {
    schoolClass: 'Level 8 Evocation (Cleric, Druid, Sorcerer, Wizard)',
    time: 'Action',
    range: '150 feet',
    components: 'V, S, M (a piece of sunstone)',
    duration: 'Instantaneous',
    desc: 'Brilliant sunlight flashes in a 60-foot-radius Sphere centered on a point you choose within range. Each creature in the Sphere makes a Constitution saving throw. On a failed save, a creature takes 12d6 Radiant damage and has the Blinded condition for 1 minute. On a successful save, it takes half as much damage only.\n\nA creature Blinded by this spell makes another Constitution saving throw at the end of each of its turns, ending the effect on itself on a success.\n\nThis spell dispels Darkness in its area that was created by any spell.'
  },
  'Synaptic Static': {
    schoolClass: 'Level 5 Enchantment (Bard, Sorcerer, Warlock, Wizard)',
    time: 'Action',
    range: '120 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    desc: 'You cause psychic energy to erupt at a point within range. Each creature in a 20-foot-radius Sphere centered on that point makes an Intelligence saving throw, taking 8d6 Psychic damage on a failed save or half as much damage on a successful one.\n\nOn a failed save, a target also has muddled thoughts for 1 minute. During that time, it subtracts 1d6 from all its attack rolls and ability checks, as well as any Constitution saving throws to maintain Concentration. The target makes an Intelligence saving throw at the end of each of its turns, ending the effect on itself on a success.'
  },
  'Tasha\'s Hideous Laughter': {
    schoolClass: 'Level 1 Enchantment (Bard, Warlock, Wizard)',
    time: 'Action',
    range: '30 feet',
    components: 'V, S, M (a tart and a feather)',
    duration: 'Concentration, up to 1 minute',
    desc: 'One creature of your choice that you can see within range makes a Wisdom saving throw. On a failed save, it has the Prone and Incapacitated conditions for the duration. During that time, it laughs uncontrollably if it’s capable of laughter, and it can’t end the Prone condition on itself.\n\nAt the end of each of its turns and each time it takes damage, it makes another Wisdom saving throw. The target has Advantage on the save if the save is triggered by damage. On a successful save, the spell ends.\n\nUsing a Higher-Level Spell Slot. You can target one additional creature for each spell slot level about 1.'
  },
  'Thunderclap': {
    schoolClass: 'Evocation Cantrip (Artificer, Bard, Druid, Sorcerer, Warlock, Wizard)',
    time: 'Action',
    range: 'Self',
    components: 'S',
    duration: 'Instantaneous',
    desc: 'Each creature in a 5-foot Emanation originating from you must succeed on a Constitution saving throw or take 1d6 Thunder damage. The spell’s thunderous sound can be heard up to 100 feet away.\n\nCantrip Upgrade. The damage increases by 1d6 when you reach levels 5 (2d6), 11 (3d6), and 17 (4d6).'
  },
  'Wall of Force': {
    schoolClass: 'Level 5 Evocation (Wizard)',
    time: 'Action',
    range: '120 feet',
    components: 'V, S, M (a shard of glass)',
    duration: 'Concentration, up to 10 minutes',
    desc: 'An Invisible wall of force springs into existence at a point you choose within range. The wall appears in any orientation you choose, as a horizontal or vertical barrier or at an angle. It can be free floating or resting on a solid surface. You can form it into a hemispherical dome or a globe with a radius of up to 10 feet, or you can shape a flat surface made up of ten 10-foot-by-10-foot panels. Each panel must be contiguous with another panel. In any form, the wall is 1/4 inch thick and lasts for the duration. If the wall cuts through a creature’s space when it appears, the creature is pushed to one side of the wall (you choose which side).\n\nNothing can physically pass through the wall. It is immune to all damage and can’t be dispelled by Dispel Magic. A Disintegrate spell destroys the wall instantly, however. The wall also extends into the Ethereal Plane and blocks ethereal travel through the wall.'
  },
};

// Sorcerer multiclass spell slot table — based on Sorcerer level only since Warlock uses Pact Magic separately
const SORC_SLOTS = {
  0: [],
  1: [2],            // 2 first-level slots
  2: [3],
  3: [4, 2],
  4: [4, 3],
  5: [4, 3, 2],
  6: [4, 3, 3],
  7: [4, 3, 3, 1],
  8: [4, 3, 3, 2],
  9: [4, 3, 3, 3, 1],
  10: [4, 3, 3, 3, 2],
  11: [4, 3, 3, 3, 2, 1],
  12: [4, 3, 3, 3, 2, 1],
  13: [4, 3, 3, 3, 2, 1, 1],
  14: [4, 3, 3, 3, 2, 1, 1],
  15: [4, 3, 3, 3, 2, 1, 1, 1],
  16: [4, 3, 3, 3, 2, 1, 1, 1]
};

// Pact Magic slots (Warlock-only, separate from above)
function pactSlots(warlockLevel) {
  if (warlockLevel === 0) return null;
  if (warlockLevel === 1) return { count: 1, level: 1 };
  if (warlockLevel === 2) return { count: 2, level: 1 };
  if (warlockLevel === 3) return { count: 2, level: 2 };
  return { count: 2, level: 2 }; // 4 = 2 slots at 2nd
}

// ============================================================
// METAMAGIC OPTIONS — full 2024 PHB Sorcerer list (rules text + SP cost).
// Caelen knows Quickened + Subtle from L6 (Metamagic feature) plus one more
// pick at L14 (see LEVEL_DATA[14].feat below). getKnownMetamagicIds() is the
// single source of truth for "which options can I actually apply right now" —
// used by the class feature text, the L14 picker, and the cast popover.
// ============================================================
const METAMAGIC_OPTIONS = {
  careful:    { name: 'Careful Spell',   cost: 1, costLabel: '1 SP',  desc: "When you cast a spell that forces other creatures to make a saving throw, you can protect some of them from its full force. Choose a number of those creatures up to your Charisma modifier (minimum of one creature). A chosen creature automatically succeeds on its saving throw, and it takes no damage if it would normally take half damage on a successful save." },
  distant:    { name: 'Distant Spell',   cost: 1, costLabel: '1 SP',  desc: "When you cast a spell that has a range of 5 feet or greater, you can double the range of the spell. When you cast a spell that has a range of Touch, you can make the range of the spell 30 feet." },
  empowered:  { name: 'Empowered Spell', cost: 1, costLabel: '1 SP',  desc: "When you roll damage for a spell, you can reroll a number of the damage dice up to your Charisma modifier (minimum of one die), and you must use the new rolls. You can use Empowered Spell even if you've already used a different Metamagic option during the casting of the spell." },
  extended:   { name: 'Extended Spell',  cost: 1, costLabel: '1 SP',  desc: "When you cast a spell that has a duration of 1 minute or longer, you can double its duration, to a maximum duration of 24 hours." },
  heightened: { name: 'Heightened Spell',cost: 3, costLabel: '3 SP',  desc: "When you cast a spell that forces a creature to make a saving throw to resist its effects, you can give one target of the spell Disadvantage on its first saving throw made against the spell." },
  quickened:  { name: 'Quickened Spell', cost: 2, costLabel: '2 SP',  desc: "When you cast a spell that has a casting time of an action, you can change the casting time to a Bonus Action for this casting." },
  seeking:    { name: 'Seeking Spell',   cost: 1, costLabel: '1 SP',  desc: "If you make an attack roll for a spell and miss, you can reroll the die. You must use the new roll, and you can't use this Metamagic option again on the same casting of the spell." },
  subtle:     { name: 'Subtle Spell',    cost: 1, costLabel: '1 SP',  desc: "When you cast a spell, you can cast it without any Verbal or Somatic components." },
  twinned:    { name: 'Twinned Spell',   cost: null, costLabel: 'SP = spell level (min 1)', desc: "When you cast a spell that targets only one creature and doesn't have a range of Self, you can spend a number of Sorcery Points equal to the spell's level to target a second creature in range with the same spell (1 Sorcery Point if the spell is a Cantrip)." }
};

// Metamagic options Caelen actually knows at a given character level: L6
// grants Quickened + Subtle (hardcoded — see the 'metamagic' feature below),
// L14 adds one more from LEVEL_DATA[14].feat's alternates pick.
function getKnownMetamagicIds(level) {
  const ids = [];
  if (level >= 6) ids.push('quickened', 'subtle');
  if (level >= 14) ids.push(state.alternates['lvl14-metamagic'] || 'twinned');
  return ids;
}

// Class features that gate on level
const CLASS_FEATURES = [
  // Warlock
  { id: 'pact-magic', name: 'Pact Magic', level: 1, source: 'Warlock', desc: 'Spell slots recover on a short or long rest. All pact slots are the same level.' },
  { id: 'hex-warrior', name: 'Hex Warrior', level: 1, source: 'Warlock (Hexblade)', desc: 'Use CHA instead of STR/DEX for attack and damage with one bonded weapon (the sickle).' },
  { id: 'hexblades-curse', name: "Hexblade's Curse", level: 1, source: 'Warlock (Hexblade)', desc: 'See "The Engine" section above.' },
  { id: 'agonizing', name: 'Agonizing Blast', level: 1, source: 'Eldritch Invocation', desc: 'Add CHA mod to each beam of Eldritch Blast.' },
  { id: 'repelling', name: 'Repelling Blast', level: 2, source: 'Eldritch Invocation', desc: 'Push targets 10 ft on Eldritch Blast hit.' },
  { id: 'devils-sight', name: "Devil's Sight", level: 2, source: 'Eldritch Invocation', desc: 'See in normal and magical darkness up to 120 ft.' },
  { id: 'magical-cunning', name: 'Magical Cunning', level: 2, source: 'Warlock', desc: 'Esoteric rite (1 minute) regains expended Pact Magic slots up to half your maximum (round up). Once per Long Rest.' },
  { id: 'pact-chain', name: 'Pact of the Chain', level: 3, source: 'Warlock', desc: 'Summon a familiar (Imp: Vex). 60-ft telepathy, invisibility, can deliver touch spells, and (unlike a normal familiar) can Attack on her own turn. Full stat block: Engine section → "Familiar — Vex".' },
  // Sorcerer
  { id: 'innate-sorcery', name: 'Innate Sorcery', level: 5, source: 'Sorcerer', desc: 'Twice per day, bonus action: +1 spell save DC and advantage on spell attack rolls for 1 minute.' },
  { id: 'font-of-magic', name: 'Font of Magic', level: 6, source: 'Sorcerer', desc: 'Sorcery points = Sorcerer level. Convert slots to points and back.' },
  { id: 'metamagic', name: 'Metamagic', level: 6, source: 'Sorcerer', desc: 'Quickened Spell (cast as bonus action) + Subtle Spell (no verbal/somatic).' },
  { id: 'wild-magic-table', name: 'Wild Magic Surge', level: 7, source: 'Sorcerer (Wild Magic)', desc: 'When you cast a Sorcerer spell of 1st level or higher, you may roll on the surge table. Tides of Chaos can force a surge.' },
  { id: 'sorcerous-restoration', name: 'Sorcerous Restoration', level: 9, source: 'Sorcerer', desc: 'When you finish a Short Rest, you can regain expended Sorcery Points, but no more than a number equal to half your Sorcerer level (round down). Once you use this feature, you can\'t do so again until you finish a Long Rest.' },
  { id: 'bend-luck', name: 'Bend Luck', level: 10, source: 'Wild Magic', desc: 'Spend 2 sorcery points to add or subtract a d4 from a roll within 30 ft (reaction).' },
  { id: 'sorcery-incarnate', name: 'Sorcery Incarnate', level: 11, source: 'Sorcerer', desc: 'If you have no uses of Innate Sorcery left, you can use it if you spend 2 Sorcery Points when you take the Bonus Action to activate it. In addition, while your Innate Sorcery feature is active, you can use up to two of your Metamagic options on each spell you cast.' },
  { id: 'controlled-chaos', name: 'Controlled Chaos', level: 18, source: 'Wild Magic', desc: 'When you roll on the Wild Magic table, roll twice and pick the result.' }
];

// Combat loops by level
const COMBAT_LOOPS = [
  { minLevel: 1, name: 'Standard Turn (Levels 1-6)', desc: 'Hex on the priority target (bonus action) → Eldritch Blast (action). Maintain Hex; move it to a new target as a bonus action when one drops.' },
  { minLevel: 7, name: 'Standard Turn (Level 7+)', desc: 'Eldritch Blast (action) → Quickened Spell, 2 sorcery points → Eldritch Blast (bonus action). Two full attack sequences per turn.' },
  { minLevel: 1, name: 'Hard Fight Opener', desc: 'Turn 1: Hex (bonus action), Eldritch Blast. Turn 2: Hexblade\'s Curse (bonus action), Eldritch Blast. Turn 3+: settle into the Standard Loop.' },
  { minLevel: 9, name: 'Emergency Turn', desc: 'Counterspell on their big spell (reaction) → Eldritch Blast (action) → Shield or Silvery Barbs as needed (reaction).' }
];

const SKILL_LIST = [
  { name: 'Athletics', ability: 'str' },
  { name: 'Acrobatics', ability: 'dex', prof: true },
  { name: 'Sleight of Hand', ability: 'dex' },
  { name: 'Stealth', ability: 'dex' },
  { name: 'Arcana', ability: 'int', prof: true },
  { name: 'History', ability: 'int' },
  { name: 'Investigation', ability: 'int' },
  { name: 'Nature', ability: 'int' },
  { name: 'Religion', ability: 'int' },
  { name: 'Animal Handling', ability: 'wis' },
  { name: 'Insight', ability: 'wis' },
  { name: 'Medicine', ability: 'wis' },
  { name: 'Perception', ability: 'wis' },
  { name: 'Survival', ability: 'wis' },
  { name: 'Deception', ability: 'cha', prof: true },
  { name: 'Intimidation', ability: 'cha', prof: true },
  { name: 'Performance', ability: 'cha', prof: true },
  { name: 'Persuasion', ability: 'cha' }
];

// ============================================================
// WEAPON MASTERY REFERENCE — 2024 PHB one-line rules text for each of the
// 8 Weapon Mastery properties, so no one ever has to open the book mid-fight.
// Used both for the collapsible glossary card and as tooltips wherever a
// mastery name is displayed (equipped-weapon tags, gear-edit modal).
// ============================================================
const WEAPON_MASTERIES = {
  Cleave: 'If you hit a creature with a melee attack using this weapon, you can make an additional attack roll with the same weapon (no extra action or bonus action needed) against a second creature within 5 feet of the first that is also within your weapon\'s reach. On a hit, the second creature takes the weapon\'s damage, but don\'t add your ability modifier to that damage unless it\'s negative. You can use this once per turn.',
  Graze: 'If your attack roll with this weapon misses a creature, you can deal damage to that creature equal to the ability modifier you used to make the attack roll. This damage is of the weapon\'s damage type, and it can\'t be increased in any way.',
  Nick: 'When you attack with this Light weapon and take the Attack action to make the extra attack the Light property grants, you can make that extra attack as part of the same action instead of as a Bonus Action. You can use this property only once per turn.',
  Push: 'If you hit a creature with this weapon and it is Large or smaller, you can push it up to 10 feet straight away from you.',
  Sap: 'If you hit a creature with this weapon, that creature has Disadvantage on its next attack roll before the start of your next turn.',
  Slow: 'If you hit a creature with this weapon and deal damage, you can reduce that creature\'s Speed by 10 feet until the start of your next turn.',
  Topple: 'If you hit a creature with this weapon, you can force it to make a Constitution saving throw (DC 8 + the ability modifier used for the attack + your Proficiency Bonus). On a failure, the creature has the Prone condition.',
  Vex: 'If you hit a creature with this weapon, you gain Advantage on your next attack roll against that same creature before the end of your next turn.'
};

// ============================================================
// GEAR LIBRARY — common armor, shields, weapons, magic items.
// Picked via the Add Gear modal's "From Library" tab; each entry's
// fields are auto-merged into the new gear item created.
//
// Item shape conventions:
//   type:               'armor'|'shield'|'weapon'|'wondrous'|'ring'|'cloak'|'boots'|'wand'|'rod'|'amulet'|'misc'
//   weight:             pounds
//   requiresAttunement: bool
//   rarity:             string (display only)
//   armorBase:          AC base (armor only) — final AC = base + capped DEX + shield + magic
//   armorType:          'light'|'medium'|'heavy' (controls DEX cap: light=∞, medium=+2, heavy=0)
//   stealthDisadv:      bool
//   strReq:             STR score required (heavy armor)
//   damage:             dice (weapon only) — e.g., '1d10'
//   damageType:         'slashing'|'piercing'|'bludgeoning' (or magic types for special weapons)
//   weaponCategory:     'simple-melee'|'simple-ranged'|'martial-melee'|'martial-ranged'
//   properties:         comma-sep string ('Heavy, Reach, Two-Handed')
//   mastery:            mastery name ('Graze' etc.)
//   ability:            'str'|'dex'|'finesse'|'cha' (override for spellcasters)
//   acBonus:            magical bonus to AC (Cloak/Ring of Protection, Bracers)
//   saveBonus:          magical bonus to ALL saves (Cloak/Ring of Protection)
//   attackBonus:        magical bonus on weapon attacks (+1/+2/+3 weapons)
//   damageBonus:        magical bonus to weapon damage
//   speedBonus:         magical Speed bonus
//   hpBonus:            magical max HP bonus
//   statOverride:       { str: 19, ... }  (sets ability to this value if > current; Gauntlets / Belt / Headband)
//   chargesMax:         max charges (wands)
//   chargesRecover:     'dawn'|'long-rest'|'short-rest' (for charged items)
//   notes:              free-form description shown in detail modal
const GEAR_LIBRARY = [
  // ----- MUNDANE ARMOR (Light) -----
  { name: 'Padded',            type: 'armor',  weight: 8,  armorBase: 11, armorType: 'light',  stealthDisadv: true,  rarity: 'Mundane' },
  { name: 'Leather',           type: 'armor',  weight: 10, armorBase: 11, armorType: 'light',  rarity: 'Mundane' },
  { name: 'Studded Leather',   type: 'armor',  weight: 13, armorBase: 12, armorType: 'light',  rarity: 'Mundane' },
  // ----- MUNDANE ARMOR (Medium) -----
  { name: 'Hide',              type: 'armor',  weight: 12, armorBase: 12, armorType: 'medium', rarity: 'Mundane' },
  { name: 'Chain Shirt',       type: 'armor',  weight: 20, armorBase: 13, armorType: 'medium', rarity: 'Mundane' },
  { name: 'Scale Mail',        type: 'armor',  weight: 45, armorBase: 14, armorType: 'medium', stealthDisadv: true, rarity: 'Mundane' },
  { name: 'Breastplate',       type: 'armor',  weight: 20, armorBase: 14, armorType: 'medium', rarity: 'Mundane' },
  { name: 'Half Plate',        type: 'armor',  weight: 40, armorBase: 15, armorType: 'medium', stealthDisadv: true, rarity: 'Mundane' },
  // ----- MUNDANE ARMOR (Heavy) -----
  { name: 'Ring Mail',         type: 'armor',  weight: 40, armorBase: 14, armorType: 'heavy',  stealthDisadv: true, rarity: 'Mundane' },
  { name: 'Chain Mail',        type: 'armor',  weight: 55, armorBase: 16, armorType: 'heavy',  stealthDisadv: true, strReq: 13, rarity: 'Mundane' },
  { name: 'Splint',            type: 'armor',  weight: 60, armorBase: 17, armorType: 'heavy',  stealthDisadv: true, strReq: 15, rarity: 'Mundane' },
  { name: 'Plate',             type: 'armor',  weight: 65, armorBase: 18, armorType: 'heavy',  stealthDisadv: true, strReq: 15, rarity: 'Mundane' },
  // ----- SHIELD -----
  { name: 'Shield',            type: 'shield', weight: 6,  acBonus: 2, rarity: 'Mundane' },
  // ----- MAGIC ARMOR (+1/+2/+3 generic) -----
  { name: '+1 Armor',          type: 'armor',  acBonus: 1, requiresAttunement: false, rarity: 'Rare',      notes: 'Apply on top of any base armor (set the base armor in this same entry).' },
  { name: '+2 Armor',          type: 'armor',  acBonus: 2, rarity: 'Very Rare', notes: 'Apply on top of any base armor.' },
  { name: '+3 Armor',          type: 'armor',  acBonus: 3, rarity: 'Legendary', notes: 'Apply on top of any base armor.' },
  { name: 'Mithral Chain Mail',type: 'armor',  weight: 30, armorBase: 16, armorType: 'heavy',  rarity: 'Uncommon', notes: 'No STR requirement; no Stealth Disadvantage.' },
  { name: 'Mithral Plate',     type: 'armor',  weight: 40, armorBase: 18, armorType: 'heavy',  rarity: 'Uncommon', notes: 'No STR requirement; no Stealth Disadvantage.' },
  { name: 'Elven Chain',       type: 'armor',  weight: 14, armorBase: 13, armorType: 'medium', rarity: 'Rare',     notes: 'Proficiency granted while worn; counts as medium for DEX cap.' },
  // ----- MAGIC PROTECTION -----
  { name: 'Cloak of Protection', type: 'cloak', weight: 1, requiresAttunement: true, acBonus: 1, saveBonus: 1, rarity: 'Uncommon', notes: '+1 to AC and saving throws while worn (attuned).' },
  { name: 'Ring of Protection',  type: 'ring',  weight: 0, requiresAttunement: true, acBonus: 1, saveBonus: 1, rarity: 'Rare',     notes: '+1 to AC and saving throws while worn (attuned).' },
  { name: 'Bracers of Defense',  type: 'wondrous', weight: 1, requiresAttunement: true, acBonus: 2, rarity: 'Rare', notes: '+2 AC while worn (attuned) and you are wearing NO armor and NOT using a shield.' },
  // ----- MAGIC WEAPONS (+1/+2/+3 generic) -----
  { name: '+1 Weapon',         type: 'weapon', attackBonus: 1, damageBonus: 1, rarity: 'Uncommon',  notes: 'Set the base weapon type in this same entry.' },
  { name: '+2 Weapon',         type: 'weapon', attackBonus: 2, damageBonus: 2, rarity: 'Rare',      notes: 'Set the base weapon type in this same entry.' },
  { name: '+3 Weapon',         type: 'weapon', attackBonus: 3, damageBonus: 3, rarity: 'Very Rare', notes: 'Set the base weapon type in this same entry.' },
  { name: 'Flame Tongue',      type: 'weapon', weight: 3, requiresAttunement: true, damage: '1d8', damageType: 'slashing', weaponCategory: 'martial-melee', ability: 'str', rarity: 'Rare', notes: 'Bonus action: flame ignites/extinguishes. While flaming, deals +2d6 fire damage on hit. Bright light 40 ft.' },
  { name: 'Holy Avenger',      type: 'weapon', weight: 3, requiresAttunement: true, damage: '1d8', damageType: 'slashing', weaponCategory: 'martial-melee', ability: 'str', attackBonus: 3, damageBonus: 3, rarity: 'Legendary', notes: 'Paladin-only. +3 weapon. Deals +2d10 radiant on Fiend or Undead. 10-ft (30 ft at L18) aura: you + allies have Adv vs. spells, and Resistance to spell damage.' },
  // ----- MUNDANE WEAPONS (so the picker has the basics) -----
  { name: 'Dagger',            type: 'weapon', weight: 1,  damage: '1d4',  damageType: 'piercing',  weaponCategory: 'simple-melee', properties: 'Finesse, Light, Thrown 20/60', mastery: 'Nick',  ability: 'finesse', rarity: 'Mundane' },
  { name: 'Quarterstaff',      type: 'weapon', weight: 4,  damage: '1d6',  damageType: 'bludgeoning', weaponCategory: 'simple-melee', properties: 'Versatile (1d8)', mastery: 'Topple', ability: 'str', rarity: 'Mundane' },
  { name: 'Spear',             type: 'weapon', weight: 3,  damage: '1d6',  damageType: 'piercing',  weaponCategory: 'simple-melee', properties: 'Thrown 20/60, Versatile (1d8)', mastery: 'Sap', ability: 'str', rarity: 'Mundane' },
  { name: 'Javelin',           type: 'weapon', weight: 2,  damage: '1d6',  damageType: 'piercing',  weaponCategory: 'simple-melee', properties: 'Thrown 30/120', mastery: 'Slow', ability: 'str', rarity: 'Mundane' },
  { name: 'Shortsword',        type: 'weapon', weight: 2,  damage: '1d6',  damageType: 'piercing',  weaponCategory: 'martial-melee', properties: 'Finesse, Light', mastery: 'Vex', ability: 'finesse', rarity: 'Mundane' },
  { name: 'Rapier',            type: 'weapon', weight: 2,  damage: '1d8',  damageType: 'piercing',  weaponCategory: 'martial-melee', properties: 'Finesse', mastery: 'Vex', ability: 'finesse', rarity: 'Mundane' },
  { name: 'Longsword',         type: 'weapon', weight: 3,  damage: '1d8',  damageType: 'slashing',  weaponCategory: 'martial-melee', properties: 'Versatile (1d10)', mastery: 'Sap', ability: 'str', rarity: 'Mundane' },
  { name: 'Warhammer',         type: 'weapon', weight: 2,  damage: '1d8',  damageType: 'bludgeoning', weaponCategory: 'martial-melee', properties: 'Versatile (1d10)', mastery: 'Push', ability: 'str', rarity: 'Mundane' },
  { name: 'Greatsword',        type: 'weapon', weight: 6,  damage: '2d6',  damageType: 'slashing',  weaponCategory: 'martial-melee', properties: 'Heavy, Two-Handed', mastery: 'Graze', ability: 'str', rarity: 'Mundane' },
  { name: 'Greataxe',          type: 'weapon', weight: 7,  damage: '1d12', damageType: 'slashing',  weaponCategory: 'martial-melee', properties: 'Heavy, Two-Handed', mastery: 'Cleave', ability: 'str', rarity: 'Mundane' },
  { name: 'Maul',              type: 'weapon', weight: 10, damage: '2d6',  damageType: 'bludgeoning', weaponCategory: 'martial-melee', properties: 'Heavy, Two-Handed', mastery: 'Topple', ability: 'str', rarity: 'Mundane' },
  { name: 'Halberd',           type: 'weapon', weight: 6,  damage: '1d10', damageType: 'slashing',  weaponCategory: 'martial-melee', properties: 'Heavy, Reach, Two-Handed', mastery: 'Cleave', ability: 'str', rarity: 'Mundane' },
  { name: 'Glaive',            type: 'weapon', weight: 6,  damage: '1d10', damageType: 'slashing',  weaponCategory: 'martial-melee', properties: 'Heavy, Reach, Two-Handed', mastery: 'Graze', ability: 'str', rarity: 'Mundane' },
  { name: 'Pike',              type: 'weapon', weight: 18, damage: '1d10', damageType: 'piercing',  weaponCategory: 'martial-melee', properties: 'Heavy, Reach, Two-Handed', mastery: 'Push', ability: 'str', rarity: 'Mundane' },
  { name: 'Light Crossbow',    type: 'weapon', weight: 5,  damage: '1d8',  damageType: 'piercing',  weaponCategory: 'simple-ranged', properties: 'Ammunition (80/320), Loading, Two-Handed', mastery: 'Slow', ability: 'dex', rarity: 'Mundane' },
  { name: 'Heavy Crossbow',    type: 'weapon', weight: 18, damage: '1d10', damageType: 'piercing',  weaponCategory: 'martial-ranged', properties: 'Ammunition (100/400), Heavy, Loading, Two-Handed', mastery: 'Push', ability: 'dex', rarity: 'Mundane' },
  { name: 'Shortbow',          type: 'weapon', weight: 2,  damage: '1d6',  damageType: 'piercing',  weaponCategory: 'simple-ranged', properties: 'Ammunition (80/320), Two-Handed', mastery: 'Vex', ability: 'dex', rarity: 'Mundane' },
  { name: 'Longbow',           type: 'weapon', weight: 2,  damage: '1d8',  damageType: 'piercing',  weaponCategory: 'martial-ranged', properties: 'Ammunition (150/600), Heavy, Two-Handed', mastery: 'Slow', ability: 'dex', rarity: 'Mundane' },
  { name: 'Pistol',            type: 'weapon', weight: 3,  damage: '1d10', damageType: 'piercing',  weaponCategory: 'martial-ranged', properties: 'Ammunition (30/90), Loading', mastery: 'Vex', ability: 'dex', rarity: 'Mundane', notes: 'Firearm. Uses Firearm Bullets. Artificers may set ability to INT.' },
  { name: 'Musket',            type: 'weapon', weight: 10, damage: '1d12', damageType: 'piercing',  weaponCategory: 'martial-ranged', properties: 'Ammunition (40/120), Loading, Two-Handed', mastery: 'Slow', ability: 'dex', rarity: 'Mundane', notes: 'Firearm. Uses Firearm Bullets. Artificers may set ability to INT.' },
  // ----- REMAINING MUNDANE WEAPONS (2024 PHB) -----
  { name: 'Club',              type: 'weapon', weight: 2,  damage: '1d4',  damageType: 'bludgeoning', weaponCategory: 'simple-melee', properties: 'Light', mastery: 'Slow', ability: 'str', rarity: 'Mundane' },
  { name: 'Greatclub',         type: 'weapon', weight: 10, damage: '1d8',  damageType: 'bludgeoning', weaponCategory: 'simple-melee', properties: 'Two-Handed', mastery: 'Push', ability: 'str', rarity: 'Mundane' },
  { name: 'Handaxe',           type: 'weapon', weight: 2,  damage: '1d6',  damageType: 'slashing', weaponCategory: 'simple-melee', properties: 'Light, Thrown (20/60)', mastery: 'Vex', ability: 'str', rarity: 'Mundane' },
  { name: 'Light Hammer',      type: 'weapon', weight: 2,  damage: '1d4',  damageType: 'bludgeoning', weaponCategory: 'simple-melee', properties: 'Light, Thrown (20/60)', mastery: 'Nick', ability: 'str', rarity: 'Mundane' },
  { name: 'Mace',              type: 'weapon', weight: 4,  damage: '1d6',  damageType: 'bludgeoning', weaponCategory: 'simple-melee', properties: '—', mastery: 'Sap', ability: 'str', rarity: 'Mundane' },
  { name: 'Sickle',            type: 'weapon', weight: 2,  damage: '1d4',  damageType: 'slashing', weaponCategory: 'simple-melee', properties: 'Light', mastery: 'Nick', ability: 'str', rarity: 'Mundane' },
  { name: 'Dart',              type: 'weapon', weight: 0.25, damage: '1d4', damageType: 'piercing', weaponCategory: 'simple-ranged', properties: 'Finesse, Thrown (20/60)', mastery: 'Vex', ability: 'finesse', rarity: 'Mundane' },
  { name: 'Sling',             type: 'weapon', weight: 0,  damage: '1d4',  damageType: 'bludgeoning', weaponCategory: 'simple-ranged', properties: 'Ammunition (30/120)', mastery: 'Slow', ability: 'dex', rarity: 'Mundane' },
  { name: 'Battleaxe',         type: 'weapon', weight: 4,  damage: '1d8',  damageType: 'slashing', weaponCategory: 'martial-melee', properties: 'Versatile (1d10)', mastery: 'Topple', ability: 'str', rarity: 'Mundane' },
  { name: 'Flail',             type: 'weapon', weight: 2,  damage: '1d8',  damageType: 'bludgeoning', weaponCategory: 'martial-melee', properties: '—', mastery: 'Sap', ability: 'str', rarity: 'Mundane' },
  { name: 'Lance',             type: 'weapon', weight: 6,  damage: '1d10', damageType: 'piercing', weaponCategory: 'martial-melee', properties: 'Heavy, Reach, Two-Handed', mastery: 'Topple', ability: 'str', rarity: 'Mundane' },
  { name: 'Morningstar',       type: 'weapon', weight: 4,  damage: '1d8',  damageType: 'piercing', weaponCategory: 'martial-melee', properties: '—', mastery: 'Sap', ability: 'str', rarity: 'Mundane' },
  { name: 'Scimitar',          type: 'weapon', weight: 3,  damage: '1d6',  damageType: 'slashing', weaponCategory: 'martial-melee', properties: 'Finesse, Light', mastery: 'Nick', ability: 'finesse', rarity: 'Mundane' },
  { name: 'Trident',           type: 'weapon', weight: 4,  damage: '1d8',  damageType: 'piercing', weaponCategory: 'martial-melee', properties: 'Thrown (20/60), Versatile (1d10)', mastery: 'Topple', ability: 'str', rarity: 'Mundane' },
  { name: 'War Pick',          type: 'weapon', weight: 2,  damage: '1d8',  damageType: 'piercing', weaponCategory: 'martial-melee', properties: 'Versatile (1d10)', mastery: 'Sap', ability: 'str', rarity: 'Mundane' },
  { name: 'Whip',              type: 'weapon', weight: 3,  damage: '1d4',  damageType: 'slashing', weaponCategory: 'martial-melee', properties: 'Finesse, Reach', mastery: 'Slow', ability: 'finesse', rarity: 'Mundane' },
  { name: 'Blowgun',           type: 'weapon', weight: 1,  damage: '1',    damageType: 'piercing', weaponCategory: 'martial-ranged', properties: 'Ammunition (25/100), Loading', mastery: 'Vex', ability: 'dex', rarity: 'Mundane' },
  { name: 'Hand Crossbow',     type: 'weapon', weight: 3,  damage: '1d6',  damageType: 'piercing', weaponCategory: 'martial-ranged', properties: 'Ammunition (30/120), Light, Loading', mastery: 'Vex', ability: 'dex', rarity: 'Mundane' },
  // ----- WONDROUS - STAT OVERRIDES -----
  { name: 'Amulet of Health',          type: 'amulet',   weight: 1, requiresAttunement: true, statOverride: { con: 19 }, rarity: 'Rare',    notes: 'Sets CON to 19 while worn (attuned). No effect if CON ≥ 19.' },
  { name: 'Gauntlets of Ogre Power',   type: 'wondrous', weight: 2, requiresAttunement: true, statOverride: { str: 19 }, rarity: 'Uncommon', notes: 'Sets STR to 19 while worn (attuned).' },
  { name: 'Belt of Hill Giant Strength', type: 'wondrous', weight: 1, requiresAttunement: true, statOverride: { str: 21 }, rarity: 'Rare',  notes: 'Sets STR to 21 while worn (attuned).' },
  { name: 'Headband of Intellect',     type: 'wondrous', weight: 1, requiresAttunement: true, statOverride: { int: 19 }, rarity: 'Uncommon', notes: 'Sets INT to 19 while worn (attuned).' },
  // ----- WONDROUS - MOBILITY -----
  { name: 'Boots of Speed',            type: 'boots',    weight: 1, requiresAttunement: true, rarity: 'Rare',     notes: 'Bonus Action: heels glow. Speed doubles for up to 10 minutes. Opportunity Attacks have Disadvantage against you. Once spent, can\'t use again until you finish a Long Rest.' },
  { name: 'Boots of Striding and Springing', type: 'boots', weight: 1, requiresAttunement: true, rarity: 'Uncommon', notes: 'Your walking Speed becomes 30 (if lower). Jump distance is tripled.' },
  { name: 'Boots of Elvenkind',        type: 'boots',    weight: 1, requiresAttunement: false, rarity: 'Uncommon', notes: 'Advantage on Stealth checks while moving. Footsteps are silent.' },
  { name: 'Winged Boots',              type: 'boots',    weight: 1, requiresAttunement: true, rarity: 'Uncommon', notes: 'Fly Speed = walking Speed. Up to 4 hours total before recharge (1-hour increments). Recovers all flight time on a Long Rest.' },
  // ----- WONDROUS - DEFENSE / UTILITY -----
  { name: 'Cloak of Displacement',     type: 'cloak',    weight: 1, requiresAttunement: true, rarity: 'Rare',     notes: 'Attacks against you have Disadvantage. Lapses for 1 round if you take damage.' },
  { name: 'Cloak of Elvenkind',        type: 'cloak',    weight: 1, requiresAttunement: true, rarity: 'Uncommon', notes: 'Wisdom (Perception) checks to see you have Disadvantage. Stealth checks have Advantage.' },
  { name: 'Goggles of Night',          type: 'wondrous', weight: 0, rarity: 'Uncommon', senses: 'Darkvision 60 ft', notes: 'Darkvision 60 ft (auto-applied to the Senses list while worn).' },
  // ----- WANDS -----
  { name: 'Wand of Magic Missiles',    type: 'wand',     weight: 1, requiresAttunement: false, chargesMax: 7, chargesRecover: 'dawn', rarity: 'Uncommon', notes: 'Expend N charges to cast Magic Missile at level N (1-7). Recover 1d6+1 charges at dawn. Roll d20 if last charge used: 1 = wand crumbles.' },
  { name: 'Wand of Web',               type: 'wand',     weight: 1, requiresAttunement: true, chargesMax: 7, chargesRecover: 'dawn', rarity: 'Uncommon', notes: 'Cast Web (DC 15). Recover 1d6+1 charges at dawn.' },
  // ----- CONSUMABLES (potions) -----
  { name: 'Potion of Healing',           type: 'consumable', weight: 0.5, rarity: 'Common',    healDice: '2d4+2' },
  { name: 'Potion of Greater Healing',   type: 'consumable', weight: 0.5, rarity: 'Uncommon',  healDice: '4d4+4' },
  { name: 'Potion of Superior Healing',  type: 'consumable', weight: 0.5, rarity: 'Rare',       healDice: '8d4+8' },
  { name: 'Potion of Supreme Healing',   type: 'consumable', weight: 0.5, rarity: 'Very Rare',  healDice: '10d4+20' },
  { name: 'Antitoxin',                   type: 'consumable', weight: 0,   rarity: 'Common',    notes: 'Drink before a Poison saving throw within the next hour to gain Advantage on that save.' },
  { name: 'Potion of Fire Breath',       type: 'consumable', weight: 0.5, rarity: 'Uncommon',  notes: 'As a Magic action, exhale fire at a target within 30 ft: 4d6 Fire damage (DC 13 DEX save for half). One use.' },
  { name: 'Potion of Climbing',          type: 'consumable', weight: 0.5, rarity: 'Common',    notes: 'For 1 hour: Climbing Speed equal to your Speed, and Advantage on STR (Athletics) checks to climb.' },
  { name: 'Potion of Growth',            type: 'consumable', weight: 0.5, rarity: 'Uncommon',  notes: 'For 1d4 hours, become Large (if room): Advantage on STR checks/saves, +1d4 damage on weapon/unarmed hits. Gear grows with you; drink again to end early.' },
  { name: 'Potion of Diminution',        type: 'consumable', weight: 0.5, rarity: 'Rare',      notes: 'For 1d4 hours, shrink 1 size (min Tiny), −1d4 to weapon/unarmed damage (min 1). Drink again to end early.' },
  { name: 'Potion of Invisibility',      type: 'consumable', weight: 0.5, rarity: 'Very Rare', notes: 'For 1 hour or until you attack/cast a spell, you have the Invisible condition (also makes worn/carried gear invisible).' },
  { name: 'Potion of Speed',             type: 'consumable', weight: 0.5, rarity: 'Very Rare', notes: 'For 1 minute, as the Haste spell: Speed doubles, +2 AC, Advantage on DEX saves, extra action each turn (Attack/Dash/Disengage/Hide/Utilize). 1 turn of Lethargy after it ends.' },
  { name: 'Potion of Water Breathing',   type: 'consumable', weight: 0.5, rarity: 'Uncommon',  notes: 'Breathe underwater for 1 hour.' },
  { name: 'Potion of Animal Friendship', type: 'consumable', weight: 0.5, rarity: 'Uncommon',  notes: 'As the Animal Friendship spell (DC 13) for 1 hour, affecting one Beast within 10 ft when you drink it.' },
  { name: 'Potion of Resistance',        type: 'consumable', weight: 0.5, rarity: 'Uncommon',  notes: 'Resistance to one damage type for 1 hour (type set on the potion — note it when you get one).' },
  { name: 'Potion of Fire Giant Strength', type: 'consumable', weight: 0.5, rarity: 'Very Rare', notes: 'For 1 hour, STR becomes 25 (no effect if already ≥25).' }
];


