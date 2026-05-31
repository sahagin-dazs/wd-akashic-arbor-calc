import { HeroDef } from "./types";

export const SKILL_META_SCAFFOLD: Record<string, NonNullable<HeroDef["skillMeta"]>> = {
  SFire: {
    base: {
      name: "Summon: S Fire Mage",
      effect: "TBD"
    },
    "awakening-1": {
      name: "Kindled Familiar",
      effect: "TBD"
    },
    "awakening-2": {
      name: "Twin Drake Pact",
      effect: "TBD"
    },
    "awakening-3": {
      name: "Rapid Invocation",
      effect: "TBD"
    },
    "awakening-core": {
      name: "Infernal Dragon Queen",
      effect: "TBD"
    },
    "white-1": {
      name: "Scorching Fang",
      effect: "TBD"
    },
    "white-2": {
      name: "Scorching Fang+",
      effect: "TBD"
    },
    "atk60-1": {
      name: "Dragonflame Boost",
      effect: "TBD"
    },
    "atk60-2": {
      name: "Dragonflame Boost",
      effect: "TBD"
    },
    "blue-1": {
      name: "Dragonflame Master",
      effect: "TBD"
    },
    "blue-2": {
      name: "Wildfire Breath",
      effect: "TBD"
    },
    "blue-3": {
      name: "Frenzied Brood",
      effect: "TBD"
    }
  },
  LA: {
    base: {
      name: "Summon: Levin Archangel",
      effect: "Lightning Twins: Wield twin blades to unleash lightning waves, attacking 2 times."
    },
    "awakening-1": {
      name: "Sureblade",
      effect: "[Lightning Twins] CRIT Rate increases."
    },
    "awakening-2": {
      name: "Volt Charge",
      effect: "[Lightning Twins] ATK SPD increases."
    },
    "awakening-3": {
      name: "Graceblade",
      effect: "When casting [Lightning Twins], restore own HP."
    },
    "awakening-core": {
      name: "Arc Judicator",
      effect: "Evolves into Arc Judicator: Attacks inflict [Storm Fracture], gain [Thunder Aura] granting team 10% DMG Boost."
    },
    "white-1": {
      name: "Destiny Boon",
      effect: "Allies under [Unity Grace] gain 8% increased CRIT Rate."
    },
    "white-2": {
      name: "Keen Boon",
      effect: "Allies under [Unity Grace] gain 24% increased CRIT DMG."
    },
    "atk60-1": {
      name: "Firmament Ward",
      effect: "[Lightning Twins] DMG +60%"
    },
    "atk60-2": {
      name: "Firmament Ward",
      effect: "[Lightning Twins] DMG +60%"
    },
    "blue-1": {
      name: "Fate Eye",
      effect: "Self and allies under [Unity Grace] gain 30% Hit Rate bonus."
    },
    "blue-2": {
      name: "Storm Fracture+",
      effect: "[Storm Fracture] also reduces enemy HP Regen and EX-Weapon Energy Regen by 30%"
    },
    "blue-3": {
      name: "Crushing Aura",
      effect: "[Thunder Aura] reduces Final DMG Bonus of nearby enemy heroes by 50%."
    }
  },
  Panda: {
    base: {
      name: "Summon: Panda Brewmaster",
      effect: "Leaps 3 times, dealing AoE DMG and summoning [Verdant Bamboo] that can be targeted by enemies. Each [Verdant Bamboo] permanently increases team Max HP by 0.5% (up to 30 stacks) when it appears, and deals AoE DMG when it disappears."
    },
    "awakening-1": {
      name: "Feral Bellow",
      effect: "[Windstrike] taunts enemies hit."
    },
    "awakening-2": {
      name: "Zen Flow",
      effect: "[Windstrike] ATK Count +1"
    },
    "awakening-3": {
      name: "Zen Flow",
      effect: "[Windstrike] ATK Count +1"
    },
    "awakening-core": {
      name: "Drunken Boxing",
      effect: "Evolves into Drunken Boxing: AoE and DMG greatly increase. Chance to briefly launch enemies."
    },
    "white-1": {
      name: "Dancing Leaves",
      effect: "[Verdant Bamboo] continuously heals allies."
    },
    "white-2": {
      name: "Dancing Leaves+",
      effect: "[Verdant Bamboo] healing increases by 50%"
    },
    "atk60-1": {
      name: "Mastery Ascension",
      effect: "[Windstrike] DMG +60%"
    },
    "atk60-2": {
      name: "Mastery Ascension",
      effect: "[Windstrike] DMG +60%"
    },
    "blue-1": {
      name: "Perfect Zenith",
      effect: "[Windstrike] DMG +100%"
    },
    "blue-2": {
      name: "Crushing Descent",
      effect: "[Windstrike] reduces enemy Move SPD and Skill CD SPD, extends launch effect."
    },
    "blue-3": {
      name: "Ruinous Momentum",
      effect: "[Windstrike] CD -1s"
    }
  },
  NT: {
    base: {
      name: "Summon: Northern Tyrant",
      effect: "Blizzard Cleaver: Throw the spinning Blizzard Cleaver, dealing double damage to enemies in its path; Upon entering battle, summon 2 Frostwolves, which are permanent summoned units that remain on the field as long as the Northern Tyrant is alive, attacking enemies with Frost Claws."
    },
    "awakening-1": {
      name: "Fateful Wolf",
      effect: "Frostwolves and Frostwolf King attacks restore Northern Tyrant's HP"
    },
    "awakening-2": {
      name: "Axe Barrage",
      effect: "Blizzard Cleaver ATK Count +1"
    },
    "awakening-3": {
      name: "Axe Barrage",
      effect: "Blizzard Cleaver ATK Count +1"
    },
    "awakening-core": {
      name: "Glacier Alpha",
      effect: "Evolves into Glacier Alpha: Blizzard Cleaver DMG and range increase. Additionally summons Frostwolf King who casts Frost Shred to attack a large area."
    },
    "white-1": {
      name: "Chilled Fang",
      effect: "Frostwolves and Frostwolf King attacks inflict (Frosty Fang), reducing 10% Ice Element Resistance and causing Slow and DoT"
    },
    "white-2": {
      name: "Chilled Fang+",
      effect: "[Frosty Fang] freezes target for 3s after dealing 15 damage instances, ignoring Control Resistance"
    },
    "atk60-1": {
      name: "Winter's Edge",
      effect: "Blizzard Cleaver and own summond unit DMG +60%"
    },
    "atk60-2": {
      name: "Winter's Edge",
      effect: "Blizzard Cleaver and own summond unit DMG +60%"
    },
    "blue-1": {
      name: "Lupine Spirit",
      effect: "Blizzard Cleaver and own summoned unit DMG +100%"
    },
    "blue-2": {
      name: "Frost Claw",
      effect: "Frostwolf King's Frost Shred creates +4 claw marks."
    },
    "blue-3": {
      name: "Frenzied Pack",
      effect: "Frostwolf's Ice Claw ATK Count +2. Attack interval reduces."
    }
  },
  PD: {
    base: {
      name: "Summon: Phoenix Dancer",
      effect: "Blazing Orb: Throw a fireball that bounces among enemies, dealing area damage"
    },
    chain: {
      name: "Dance of Flames",
      effect: "Team Burn DMG greatly increased"
    },
    "awakening-1": {
      name: "Flame Chain",
      effect: "Blazing Orb ATK Count +1, Skill CD reduced"
    },
    "awakening-2": {
      name: "Flickering Flame",
      effect: "Blazing Orb Bounce Count +1"
    },
    "awakening-3": {
      name: "Flickering Flame",
      effect: "Blazing Orb Bounce Count +1"
    },
    "awakening-core": {
      name: "Inferno Wings",
      effect: "Blazing Orb DMG and AoE increase, and bounce count +1"
    },
    "white-1": {
      name: "Molten Blaze",
      effect: "Blazing Orb reduces enemy DMG Reduction by 5%"
    },
    "white-2": {
      name: "Molten Blaze+",
      effect: "Enemy Damage Reduction is further reduced by up to 10%"
    },
    "atk60-1": {
      name: "Blazing Soul",
      effect: "Blazing Orb DMG +60%"
    },
    "atk60-2": {
      name: "Blazing Soul",
      effect: "Blazing Orb DMG +60%"
    },
    "blue-1": {
      name: "Scorching Dance",
      effect: "Blazing Orb DMG +100%"
    },
    "blue-2": {
      name: "Fiery Eruption",
      effect: "Blazing Orb has a chance to stun enemies"
    },
    "blue-3": {
      name: "Raging Flame",
      effect: "Blazing Orb AoE increased and gains 20% extra CRIT Rate"
    }
  },
  SW: {
    base: {
      name: "Summon: Starlight Weaver",
      effect: "Starlit Fall: Summon a comet to bombard enemies. Designate the hero with the highest attack power as the Proxy, and charge the Proxy's Exclusive Weapon Energy by 6 points every 5 seconds."
    },
    "awakening-1": {
      name: "Comet Chain",
      effect: "Comet may summon another comet upon landing"
    },
    "awakening-2": {
      name: "Comet Burst",
      effect: "Comet Count +1"
    },
    "awakening-3": {
      name: "Comet Burst",
      effect: "Comet Count +1"
    },
    "awakening-core": {
      name: "Stellar Descent",
      effect: "Evolves into Stellar Descent: Increases DMG. Unlease a flurry of Starlit Fragments upon explosion"
    },
    "white-1": {
      name: "Starblast",
      effect: "Increase comet explosion range"
    },
    "white-2": {
      name: "Stasis Stardust",
      effect: "Enemies hit by comet explosion reduce Move SPD and skill SPD"
    },
    "atk60-1": {
      name: "Enhanced Comet",
      effect: "Comet DMG +60%"
    },
    "atk60-2": {
      name: "Enhanced Comet",
      effect: "Comet DMG +60%"
    },
    "blue-1": {
      name: "Comet Arcana",
      effect: "Comet DMG +100%"
    },
    "blue-2": {
      name: "Cosmic Scatter",
      effect: "Starlit Fragment count doubled"
    },
    "blue-3": {
      name: "Soaring Photon",
      effect: "Starlit Fragment DMG +60%"
    }
  },
  PK: {
    base: {
      name: "Summon: Peacekeeper",
      effect: "Justice Fist: Transform into a Justice Mech to attack nearby enemies; each time Justice Fist is activated, grant a shield equal to 20% of your max HP to the entire team, lasting 5 seconds, max 1 stack."
    },
    "awakening-1": {
      name: "Come at Me!",
      effect: "Justice Fist taunts nearby enemies to attack the caster"
    },
    "awakening-2": {
      name: "Justice Combo",
      effect: "Justice Fist Count +1"
    },
    "awakening-3": {
      name: "Justice Combo",
      effect: "Justice Fist Count +1"
    },
    "awakening-core": {
      name: "Peace Hammer",
      effect: "Evolves into Peace Hammer. Justice Fist attacks also trigger Peace Hammer"
    },
    "white-1": {
      name: "Justice Judgement",
      effect: "Justice Fist reduces enemy ATK by 60% for 3s. CD: 10s"
    },
    "white-2": {
      name: "Backup Power",
      effect: "Each Justice Fish recovers 0.5% Max HP"
    },
    "atk60-1": {
      name: "Overload Boost",
      effect: "Justice Fist DMG +60%"
    },
    "atk60-2": {
      name: "Overload Boost",
      effect: "Justice Fist DMG +60%"
    },
    "blue-1": {
      name: "Ultimate Strike",
      effect: "Peace Hammer DMG +100%"
    },
    "blue-2": {
      name: "Iron Wall",
      effect: "When casting Peace Hammer, DMG REDUC +10% for 3s"
    },
    "blue-3": {
      name: "Overclock Combo",
      effect: "Peace Hammer ATK Count +1"
    }
  },
  VW: {
    base: {
      name: "Summon: Void Witch",
      effect: "Xeno Watch: Summons a Piercing Sight to scout the current plane."
    },
    "awakening-1": {
      name: "Omni Vision",
      effect: "Piercing Sight Projectile Count +1"
    },
    "awakening-2": {
      name: "Interphase Vision",
      effect: "Piercing Sight Count +2"
    },
    "awakening-3": {
      name: "Interphase Vision",
      effect: "Piercing Sight Count +2"
    },
    "awakening-core": {
      name: "Xeno Gaze",
      effect: "Evolves into Xeno Gaze: Fires a continuous laser"
    },
    "white-1": {
      name: "Quantum Disorder",
      effect: "Piercing Sight inflicts Quantum Disorder, dealing DoT"
    },
    "white-2": {
      name: "Quantum Collapse",
      effect: "Enemies with Quantum Disorder explode when killed by Piercing Sight"
    },
    "atk60-1": {
      name: "Cosmic Focus",
      effect: "Piercing Sight DMG +60%"
    },
    "atk60-2": {
      name: "Cosmic Focus",
      effect: "Piercing Sight DMG +60%"
    },
    "blue-1": {
      name: "Shattered Plane",
      effect: "Piercing Sight DMG +100%"
    },
    "blue-2": {
      name: "Transplanar Vision",
      effect: "Piercing Sight Count +4"
    },
    "blue-3": {
      name: "Xeno Sync",
      effect: "Summon CD -1s"
    }
  },
  MK: {
    base: {
      name: "Summon: Sun Wukong",
      effect: "Celestial Crush: Wield the Golden Staff to attack 4 times in a row. Each stack of [Cosmic Energy] increases DMG by 75%. Sun Wukong gains 1 stack of [Cosmic Energy] when any ally upgrades 3 times, up to 4 stacks. When any ally ascends, Sun Wukong gains [Resonance Ascension] to empower the staff, greatly increasing the DMG and range of [Celestial Crush]."
    },
    "awakening-1": {
      name: "Surpise Blow",
      effect: "[Celestial Crush] first strike will always CRIT."
    },
    "awakening-2": {
      name: "Indestructible",
      effect: "DMG REDUC increases by 20%"
    },
    "awakening-3": {
      name: "Battlelust",
      effect: "[Celestial Crush] reduces the target's CRIT DMG by 30% for 3s and increases own CRIT DMG by 30%."
    },
    "awakening-core": {
      name: "Sage Blueprint",
      effect: "Evolves into Sage Blueprint: Learn [Binding Spell] to unleash it every 30s, immobilizing enemies and dealing continuous damage in the target area for 5s."
    },
    "white-1": {
      name: "Evasive Step",
      effect: "Dodge increases by 12%"

    },
    "white-2": {
      name: "Miracle Strand",
      effect: "On each Dodge, restore 20% of own Max HP. Can trigger 1 time every 10s."
    },
    "atk60-1": {
      name: "Mighty Force",
      effect: "[Celestial Crush] DMG +60%"
    },
    "atk60-2": {
      name: "Mighty Force",
      effect: "[Celestial Crush] DMG +60%"
    },
    "blue-1": {
      name: "Vitality Drain",
      effect: "[Binding Spell] DMG +100%. Continuously drain enemy EX-Weapon Energy (max 30 points)."
    },
    "blue-2": {
      name: "Fragile Bind",
      effect: "[Binding Spell] DMG +100%. Reduce enemy DMG RES by 30%."
    },
    "blue-3": {
      name: "Piercing Eyes",
      effect: "[Binding Spell] DMG +100%. Continuously dispel enemy shields."
    }
  },
  Valk: {
    base: {
      name: "Summon: Valkyrie",
      effect: "Tempest Onslaught: Approach enemies and unleash greatsword slashes, dealing area DMG. During the skill, Valkyrie cannot die. Attacks 2 times."
    },
    chain: {
      name: "War blessing",
      effect: "When own HP is below 15%, Tempest Onslaught will always CRIT until the main skill ends."
    },
    "awakening-1": {
      name: "Valour's Resurgence",
      effect: "When the skill ends, recover 30% of lost HP."
    },
    "awakening-2": {
      name: "Rapid Strike",
      effect: "Tempest Onslaught ATK Count +1"
    },
    "awakening-3": {
      name: "Rapid Strike",
      effect: "Tempest Onslaught ATK Count +1"
    },
    "awakening-core": {
      name: "Thunderborne Ascension",
      effect: "Evolves into Thunderborne Ascension: Tempest Onslaught's DMG and range greatly increase, attack count +2, attack interval shortened. Enveloped in electric currents that paralyze enemies."
    },
    "white-1": {
      name: "Gloryfeast",
      effect: "Heal upon killing enemies."
    },
    "white-2": {
      name: "Undying Bloodwar",
      effect: "Healing upon killing enemies increases."
    },
    "atk60-1": {
      name: "Enhanced Tempest Onslaught",
      effect: "Tempest Onslaught DMG +60%"
    },
    "atk60-2": {
      name: "Enhanced Tempest Onslaught",
      effect: "Tempest Onslaught DMG +60%"
    },
    "blue-1": {
      name: "Power Overwhelming",
      effect: "Tempest Onslaught DMG +100%"
    },
    "blue-2": {
      name: "Stormburst Strike",
      effect: "Tempest Onslaught ATK Count +2"
    },
    "blue-3": {
      name: "Thunder Overdrive",
      effect: "Tempest Onslaught CD -1"
    }
  },
  WR: {
    base: {
      name: "Summon: Wind Ranger",
      effect: "Piercing Shot: Continuously release 2 precise piercing arrows from long range."
    },
    chain: {
      name: "Zephyr Grace",
      effect: "Each time Dodge is triggered, gain 10% DMG bonus for 10s (Cannot stack)."
    },
    "awakening-1": {
      name: "Hawk Eye",
      effect: "Own CRIT Rate +10%"
    },
    "awakening-2": {
      name: "Stormshot Volley",
      effect: "Piercing Shot +2 multishot. Slightly extend cooldown time."
    },
    "awakening-3": {
      name: "Stormshot Volley",
      effect: "Piercing Shot +2 multishot. Slightly extend cooldown time."
    },
    "awakening-core": {
      name: "Typhoon Shot",
      effect: "Evolves into Typhoon Shot: Piercing Shot +6 multishot. Arrow DMG greatly increases. Greatly reduce shot interval."
    },
    "white-1": {
      name: "Blastbolt",
      effect: "Every 6 arrows from Piercing Shot triggers 1 Blastbolt."
    },
    "white-2": {
      name: "Zone Blast",
      effect: "Blastbolt AoE increases."
    },
    "atk60-1": {
      name: "Enhanced Piercing Shot",
      effect: "Piercing Shot DMG +60%"
    },
    "atk60-2": {
      name: "Enhanced Piercing Shot",
      effect: "Piercing Shot DMG +60%"
    },
    "blue-1": {
      name: "Sublime Execution",
      effect: "Piercing Shot DMG +100%"
    },
    "blue-2": {
      name: "Death Drizzle",
      effect: "Piercing Shot +6 multishot"
    },
    "blue-3": {
      name: "Chain Blast",
      effect: "Blastbolt Count +2",
      dependency: "white-1"
    }
  },
  Lich: {
    base: {
      name: "Summon: Lich",
      effect: "Wyvern Call: Summons 1 Frost Wyvern every 10s to aid in battle. Frost Wyvern unleashes break attacks at enemies and is treated as a hero unit. Every 5s, it releases a Frost Vortex that deals DoT and slows enemies within range."
    },
    chain: {
      name: "Freezing Exhale",
      effect: "Increases Frost Wyvern attack range with a chance to Freeze enemies for 3s."
    },
    "awakening-1": {
      name: "Blizzard Roar",
      effect: "Wyvern Breath ends with an additional Frost Explosion."
    },
    "awakening-2": {
      name: "Enraged Scourge",
      effect: "Frost Wyvern's ATK SPD increases."
    },
    "awakening-3": {
      name: "Enraged Scourge",
      effect: "Frost Wyvern's ATK SPD increases."
    },
    "awakening-core": {
      name: "Elder Frost Wyvern!",
      effect: "Evolves into Elder Frost Wyvern: Increases skill range and damage, summoning a more powerful Elder Frost Wyvern. Frost Explosion at breath end now spreads 1 time."
    },
    "white-1": {
      name: "Icy Reboot",
      effect: "Frost Fortex DMG frequency doubles."
    },
    "white-2": {
      name: "Hyperfrost",
      effect: "Frost Vortex influcts Ice Burn, reducing healing taken by 30%."
    },
    "atk60-1": {
      name: "Frostbite Boost",
      effect: "Frost Explosion and Wyvern Breath DMG +60%"
    },
    "atk60-2": {
      name: "Frostbite Boost",
      effect: "Frost Explosion and Wyvern Breath DMG +60%"
    },
    "blue-1": {
      name: "Snowcalypse",
      effect: "Frost Explosion and Wyvern Breath DMG +100%"
    },
    "blue-2": {
      name: "Cryo Ragnarok",
      effect: "Frost Explosion at breath end now spreads again."
    },
    "blue-3": {
      name: "Parting Gift",
      effect: "When Elder Frost Wyvern dies, crelease a ring of Ice Spikes to attack enemies."
    }
  },
  AA: {
    base: {
      name: "Summon: Arcane Archer",
      effect: "Thunder Afterimage: Summon Afterimage to protect allies; Afterimages launches Bouncing Electric Orb to attack enemies."
    },
    chain: {
      name: "Afterimage Tempest",
      effect: "When Afterimage ends, trigger an extra electric explosion."
    },
    "awakening-1": {
      name: "Electric Sync",
      effect: "Ally ATK increases by 20% when Afterimage is on the field"
    },
    "awakening-2": {
      name: "Bolt Echo",
      effect: "Number of Electric Orbs launched by Afterimage +1"
    },
    "awakening-3": {
      name: "Bolt Echo",
      effect: "Number of Electric Orbs launched by Afterimage +1"
    },
    "awakening-core": {
      name: "Pulse Magstorm",
      effect: "Evolves into Pulse Magstorm: Afterimage deploys Electric Field and unleashes a magstorm when it ends"
    },
    "white-1": {
      name: "Numbing Shock",
      effect: "Electric Orb and Electric Field inflct Paralysis"
    },
    "white-2": {
      name: "Bouncing Electric Orb",
      effect: "Electric Orb Bounce Count +2"
    },
    "atk60-1": {
      name: "Enhanced High-Energy Electric Orb",
      effect: "Orb DMG +60%"
    },
    "atk60-2": {
      name: "Enhanced High-Energy Electric Orb",
      effect: "Orb DMG +60%"
    },
    "blue-1": {
      name: "Voltage Boost",
      effect: "Electric field DMG +100%"
    },
    "blue-2": {
      name: "Echo Pulse",
      effect: "Electric Pulse explosion +1"
    },
    "blue-3": {
      name: "Doom Magstorm",
      effect: "Electric Pulse DMG +60%"
    }
  },
  FL: {
    base: {
      name: "Summon: Frost Lord",
      effect: "Tune: Summon Tunes to attack enemies, bouncing on contact."
    },
    chain: {
      name: "Blade & Ballad",
      effect: "Tunes grant 8% Dodge bonus to the team for 5s."
    },
    "awakening-1": {
      name: "Stirring Overture",
      effect: "Tunes increase Team CRIT DMG by 30% for 5s"
    },
    "awakening-2": {
      name: "Prolonged Note",
      effect: "Tunes Count +2"
    },
    "awakening-3": {
      name: "Prolonged Note",
      effect: "Tunes Count +2"
    },
    "awakening-core": {
      name: "Sonic Cascade",
      effect: "Evolces into Sonic Cascade: DMG increases. Summon orbiting Sonic Waves that continuously attack nearby enemies"
    },
    "white-1": {
      name: "Unceasing Echo",
      effect: "Tunes Bounce +3"
    },
    "white-2": {
      name: "Unceasing Echo",
      effect: "Tunes Bounce +3"
    },
    "atk60-1": {
      name: "Enhanced Tune",
      effect: "Tune DMG +60%"
    },
    "atk60-2": {
      name: "Enhanced Tune",
      effect: "Tune DMG +60%"
    },
    "blue-1": {
      name: "Forte Variation",
      effect: "Tunes and Sonic Waves DMG +100%"
    },
    "blue-2": {
      name: "Rapid Tempo",
      effect: "Sonic Waves reduces Team Skill CD by 20% for 5s"
    },
    "blue-3": {
      name: "Surging Soundwave",
      effect: "Sonic Waves periodically trigger Resonance Waves, each with a 20% chance to Stun."
    }
  },
  SR: {
    base: {
      name: "Summon: Scarlet Reaper",
      effect: "Soulflare Blade: Unleash a slash to sever enemies' souls."
    },
    chain: {
      name: "Evil Cleaver",
      effect: "Soulflare Blade also casts Evil Cleaver around."
    },
    "awakening-1": {
      name: "Raging Squall",
      effect: "Slash speed increases"
    },
    "awakening-2": {
      name: "Unyielding Onslaught",
      effect: "Soulflare Blade ATK Count +2"
    },
    "awakening-3": {
      name: "Unyielding Onslaught",
      effect: "Soulflare Blade ATK Count +2"
    },
    "awakening-core": {
      name: "Soulflare Overdrive",
      effect: "Evolves into Soulflare Overdrive: DMG increases and cast extra Soulchaser Slash."
    },
    "white-1": {
      name: "Demonblade Burst",
      effect: "If HP is above 50%, each slash has a chance to increase ATK."
    },
    "white-2": {
      name: "Infinite Potential",
      effect: "ATK bonus is stackable"
    },
    "atk60-1": {
      name: "Enhanced Soulflare",
      effect: "Soulflare Blade DMG +60%"
    },
    "atk60-2": {
      name: "Enhanced Soulflare",
      effect: "Soulflare Blade DMG +60%"
    },
    "blue-1": {
      name: "Supreme Edge",
      effect: "Soulflare Blade DMG +100%"
    },
    "blue-2": {
      name: "Enhanced Soulchaser",
      effect: "Soulflare Blade CD -1"
    },
    "blue-3": {
      name: "Soulchaser Combo",
      effect: "Soulflare Blade ATK Count +4"
    }
  },
  Cheffy: {
    base: {
      name: "Summon: Cheffy",
      effect: "Bunzooka: Throw Bunzooka to heal all allies every 5s"
    },
    chain: {
      name: "Flavor Symphony",
      effect: "Bunzooka ignites Burning Ground on landing"
    },
    "awakening-1": {
      name: "Boundless Bliss",
      effect: "Bunzooka launches Mini-Bun on landing"
    },
    "awakening-2": {
      name: "Bun Boom!",
      effect: "Bunzooka Count +1"
    },
    "awakening-3": {
      name: "Bun Boom!",
      effect: "Bunzooka Count +1"
    },
    "awakening-core": {
      name: "Bun-anza",
      effect: "Evolves into Bun-anza: Bigger bun, higher DMG, tastier flavor."
    },
    "white-1": {
      name: "Bun Waltz",
      effect: "Bunzooka Bounce +1"
    },
    "white-2": {
      name: "Bun Waltz",
      effect: "Bunzooka Bounce +1"
    },
    "atk60-1": {
      name: "Culinary Blast",
      effect: "Bunzooka DMG +60%"
    },
    "atk60-2": {
      name: "Culinary Blast",
      effect: "Bunzooka DMG +60%"
    },
    "blue-1": {
      name: "Yummy Bite",
      effect: "Bun-anza DMG +100%"
    },
    "blue-2": {
      name: "Sticky Dough",
      effect: "Bun-anza reduces target's Move SPD by 30%"
    },
    "blue-3": {
      name: "Hearty Serve",
      effect: "Bun-anza AoE increases"
    }
  },
  VG: {
    base: {
      name: "Summon: Vermilion Guard",
      effect: "Firestream: Fires compressed flame stream in a straight line"
    },
    chain: {
      name: "Focused Fireball",
      effect: "Firestream emits Focused Fireballs"
    },
    "awakening-1": {
      name: "Thermal Diffusion",
      effect: "Increase Team Fire DMG by 10% during Firestream"
    },
    "awakening-2": {
      name: "Firestream Stability",
      effect: "Firestream Hits +5"
    },
    "awakening-3": {
      name: "Firestream Stability",
      effect: "Firestream Hits +5"
    },
    "awakening-core": {
      name: "Focused Firestream",
      effect: "Evolves into Focused Firestream: DMG increases and the endpoint will explode."
    },
    "white-1": {
      name: "Firestream Refraction",
      effect: "Upon hit, spawn 3 additional refracted Firestream"
    },
    "white-2": {
      name: "Refraction Boost",
      effect: "Upon hit, spawned Refracted Firestream scatters additional Firestream"
    },
    "atk60-1": {
      name: "Firestream DMG Bonus",
      effect: "Firestream DMG +60%"
    },
    "atk60-2": {
      name: "Firestream DMG Bonus",
      effect: "Firestream DMG +60%"
    },
    "blue-1": {
      name: "Firestream Master",
      effect: "Firestream DMG +100%"
    },
    "blue-2": {
      name: "Heating Jet",
      effect: "Firestream Hits +10"
    },
    "blue-3": {
      name: "Scorching Melt",
      effect: "Firestream continuously pulls in nearby enemies"
    }
  },
  IQ: {
    base: {
      name: "Summon: Ice Queen",
      effect: "Ice Storm: Channels an ice storm to continuously attack enemies"
    },
    chain: {
      name: "Icicle Storm",
      effect: "Frost Summon's Summoned Unit and Ice Storm attacks generate massive Icicle Storm"
    },
    "awakening-1": {
      name: "Assault Storm",
      effect: "Ice Storm Pull Force +50%"
    },
    "awakening-2": {
      name: "Sustained Storm",
      effect: "Ice Storm Duration +2s"
    },
    "awakening-3": {
      name: "Sustained Storm",
      effect: "Ice Storm Duration +2s"
    },
    "awakening-core": {
      name: "Frigid Hurricane",
      effect: "Evolves into Frigid Hurricane: DMG and size increases. Continuously pulls distant enemies."
    },
    "white-1": {
      name: "Minor Tornado",
      effect: "Ice Storm continuously spawns Mini Tornado"
    },
    "white-2": {
      name: "Fast Minor Tornado",
      effect: "Mini Tornado spawn speed doubled"
    },
    "atk60-1": {
      name: "Storm Boost",
      effect: "Ice Storm DMG +60%"
    },
    "atk60-2": {
      name: "Storm Boost",
      effect: "Ice Storm DMG +60%"
    },
    "blue-1": {
      name: "Storm Master",
      effect: "Ice Storm DMG +100%"
    },
    "blue-2": {
      name: "Giant Storm",
      effect: "Ice Storm size +50%"
    },
    "blue-3": {
      name: "Rapid Storm",
      effect: "Ice Storm SPD +30%, duration +1s"
    }
  },
  Robot: {
    base: {
      name: "Summon: Robot",
      effect: "Volt Fist: Charges at enemies and releases an electrified punch"
    },
    chain: {
      name: "Lightning Orb",
      effect: "Pulse Laser and Volt Fist hits generate Lightning Orbs"
    },
    "awakening-1": {
      name: "Chain Fist",
      effect: "Fist Hit Count +2"
    },
    "awakening-2": {
      name: "Chain Fist",
      effect: "Fist Hit Count +2"
    },
    "awakening-3": {
      name: "EM Charge",
      effect: "Volt Fist has an AoE pulling effect on hit"
    },
    "awakening-core": {
      name: "Potent Fist",
      effect: "Evolves into Potent Fist: Volt Fist initiates with Potent Fist, striking a large AoE."
    },
    "white-1": {
      name: "EM Shield",
      effect: "Casting Volt Fist grants EM Shield reflecting DMG and paralyzing enemies"
    },
    "white-2": {
      name: "Overloaded Fist",
      effect: "Attacking paralyzed enemies triggers Shock"
    },
    "atk60-1": {
      name: "Mighty Fist",
      effect: "Fist DMG +60%"
    },
    "atk60-2": {
      name: "Mighty Fist",
      effect: "Fist DMG +60%"
    },
    "blue-1": {
      name: "Ultra Fist",
      effect: "Fist DMG +100%"
    },
    "blue-2": {
      name: "Chain Fist II",
      effect: "Fist Hit Count +4"
    },
    "blue-3": {
      name: "Ultimate Potent Fist",
      effect: "Potent Fist always crits"
    }
  },
  PC: {
    base: {
      name: "Summon: Poseidon Commander",
      effect: "Tide: Summons waves to attack."
    },
    chain: {
      name: "Icebound Abyss",
      effect: "Summoned Units in Tide can Freeze enemies"
    },
    "awakening-1": {
      name: "Endless Tide",
      effect: "Tide Count +2"
    },
    "awakening-2": {
      name: "Endless Tide",
      effect: "Tide Count +2"
    },
    "awakening-3": {
      name: "Ghost Ship",
      effect: "Tides spawn Ghost Ship for AoE DMG"
    },
    "awakening-core": {
      name: "Voracious Wave",
      effect: "Evolves into Voracious Wave: Summons a massive vortex that pulls and attacks enemies."
    },
    "white-1": {
      name: "Siren",
      effect: "Chance to spawn a Siren when summoning tide"
    },
    "white-2": {
      name: "Siren's Melody",
      effect: "Siren boosts team ATK when present"
    },
    "atk60-1": {
      name: "Mighty Tide",
      effect: "Tide DMG +60%"
    },
    "atk60-2": {
      name: "Mighty Tide",
      effect: "Tide DMG +60%"
    },
    "blue-1": {
      name: "Ultra Tide",
      effect: "Tide DMG +100%"
    },
    "blue-2": {
      name: "Tide Crash",
      effect: "Tide knockback and DMG increase"
    },
    "blue-3": {
      name: "Gigantic Surge",
      effect: "Tide Size Up"
    }
  },
  SS: {
    base: {
      name: "Summon: Sword Saint",
      effect: "Flying Sword: Summons multiple Flying Swords to automatically attack enemies"
    },
    chain: {
      name: "Blade Tempest",
      effect: "Casting Flying Sword also summons falling Flying Swords"
    },
    "awakening-1": {
      name: "Sword Art",
      effect: "Flying Sword Count +2"
    },
    "awakening-2": {
      name: "Sword Will",
      effect: "Flying Sword duration increases"
    },
    "awakening-3": {
      name: "Sword Art",
      effect: "Flying Sword Count +2"
    },
    "awakening-core": {
      name: "Gladius Divinus",
      effect: "Evolves into Gladius Divinus: Control Flying Swords and summons a falling giant sword."
    },
    "white-1": {
      name: "Guardian Sword",
      effect: "Counter attacks with multiple Flying Swords. CD: 10s."
    },
    "white-2": {
      name: "Guardian Sword II",
      effect: "Number of Counter Flying Swords doubled"
    },
    "atk60-1": {
      name: "Flying Sword Boost",
      effect: "Flying Sword DMG +60%"
    },
    "atk60-2": {
      name: "Flying Sword Boost",
      effect: "Flying Sword DMG +60%"
    },
    "blue-1": {
      name: "Flying Sword Master",
      effect: "Flying Sword DMG +100%"
    },
    "blue-2": {
      name: "Inner Balance",
      effect: "Reduces Flying Sword CD"
    },
    "blue-3": {
      name: "Advanced Sword Art",
      effect: "Flying Sword Count +4"
    }
  },
  NB: {
    base: {
      name: "Summon: Nightmare Bringer",
      effect: "Thrust: Deals piercing DMG to enemies in front."
    },
    chain: {
      name: "Wind Blade",
      effect: "Whirlwind Slash and Thrust continuously spawn Wind Blades"
    },
    "awakening-1": {
      name: "Fast Thrust",
      effect: "Reduces Thrust CD"
    },
    "awakening-2": {
      name: "Chain Thrust",
      effect: "Thrust Count +3"
    },
    "awakening-3": {
      name: "Chain Thrust",
      effect: "Thrust Count +3"
    },
    "awakening-core": {
      name: "Tempest Thrust",
      effect: "Evolve into Tempest Thrust: Ends with ultimate strike Tempest Thrust."
    },
    "white-1": {
      name: "Assault Thrust",
      effect: "Chance to boost own ATK during Thrust"
    },
    "white-2": {
      name: "Assault Thrust II",
      effect: "ATK bonus is stackable"
    },
    "atk60-1": {
      name: "Thrust Boost",
      effect: "Thrust DMG +60%"
    },
    "atk60-2": {
      name: "Thrust Boost",
      effect: "Thrust DMG +60%"
    },
    "blue-1": {
      name: "Thrust Master",
      effect: "Thrust DMG +100%"
    },
    "blue-2": {
      name: "Ranged Thrust",
      effect: "Increases Thrust range"
    },
    "blue-3": {
      name: "Chain Thrust II",
      effect: "Thrust Count +6"
    }
  },
  Odin: {
    base: {
      name: "Summon: Odin",
      effect: "Lightning Chain: Continuously fires lightning at enemies. Lightning bounces multiple times."
    },
    chain: {
      name: "Multi Lightning",
      effect: "Lightning Chain hits may trigger Multi Lightning"
    },
    "awakening-1": {
      name: "Lightning Barrage",
      effect: "Lightning Chain Count +2"
    },
    "awakening-2": {
      name: "Lightning Barrage",
      effect: "Lightning Chain Count +2"
    },
    "awakening-3": {
      name: "Swift Lightning",
      effect: "Lightning Chain DMG Up, CD Reduced"
    },
    "awakening-core": {
      name: "Infinity Spear",
      effect: "Evolves into Infinity Spear. After Lightning Chain ends, summons Infinity Spear to continuously strike nearby enemies with lightning."
    },
    "white-1": {
      name: "Godstorm Boost",
      effect: "Enhances Godstorm Shield DMG and stuns targets for 2s."
    },
    "white-2": {
      name: "Godstorm Shield",
      effect: "Triggers Godstorm Shield with knockback when enemies approach"
    },
    "atk60-1": {
      name: "Lightning Boost",
      effect: "Lightning Chain DMG +60%"
    },
    "atk60-2": {
      name: "Lightning Boost",
      effect: "Lightning Chain DMG +60%"
    },
    "blue-1": {
      name: "Lightning God",
      effect: "Lightning Chain DMG +100%"
    },
    "blue-2": {
      name: "Lightning Bounce",
      effect: "Lightning Chain Bounce +2"
    },
    "blue-3": {
      name: "Lightning Barrage II",
      effect: "Lightning Chain Count +4"
    }
  },
  BA: {
    base: {
      name: "Summon: Blazing Archer",
      effect: "Flame Arrow: Shoots flaming arrows. Periodically enters a frenzy, greatly increasing shooting speed."
    },
    chain: {
      name: "Burning Ground",
      effect: "Flame Blade and Flame Arrow hits ignite Burning Ground"
    },
    "awakening-1": {
      name: "Pyro Servant",
      effect: "Every 10 attacks summons 4 Pyro Servants (inherits partial ATK)"
    },
    "awakening-2": {
      name: "Strafe Boost",
      effect: "Frenzy duration +1s"
    },
    "awakening-3": {
      name: "Strafe Boost",
      effect: "Frenzy duration +1s"
    },
    "awakening-core": {
      name: "Pyro Rain",
      effect: "Evolves into Pyro Rain: Rains fire on enemies while Frenzied"
    },
    "white-1": {
      name: "Death Pact",
      effect: "Deal high Fire DMG to 3 random enemies and self-heal"
    },
    "white-2": {
      name: "Death Devour",
      effect: "After casting Death Pact, boosts ATK for a while"
    },
    "atk60-1": {
      name: "Fire Arrow DMG Bonus",
      effect: "Flame Arrow DMG +60%"
    },
    "atk60-2": {
      name: "Fire Arrow DMG Bonus",
      effect: "Flame Arrow DMG +60%"
    },
    "blue-1": {
      name: "Fire Arrow Master",
      effect: "Flame Arrow DMG +100%"
    },
    "blue-2": {
      name: "Pyro Boost",
      effect: "Flame Arrows may trigger chain explosions"
    },
    "blue-3": {
      name: "Strafe Boost II",
      effect: "Frenzy Duration +2s"
    }
  },
  SM: {
    base: {
      name: "Summon: Shadow Master",
      effect: "Whilrwind Slash: Teleports to a random enemy for a wide AoE attack"
    },
    chain: {
      name: "Wind Blade",
      effect: "Whirlwind Slash and Thrust continuously spawn Wind Blades"
    },
    "awakening-1": {
      name: "Whirlwind Slash Combo",
      effect: "Whirlwind Slash Count +1"
    },
    "awakening-2": {
      name: "Whirlwind Slash Combo",
      effect: "Whirlwind Slash Count +1"
    },
    "awakening-3": {
      name: "Fast Whirlwind Slash",
      effect: "Whirlwind Slash SPD Up"
    },
    "awakening-core": {
      name: "Blade Storm",
      effect: "Evolves into Blade Storm: DMG increases and continuously fires blade winds."
    },
    "white-1": {
      name: "Whirlwind Shield",
      effect: "Increases DEF during Whirlwind Slash"
    },
    "white-2": {
      name: "Bloodthirsty Slash",
      effect: "Restores HP on Whirlwind Slash kill"
    },
    "atk60-1": {
      name: "Enhanced Slash",
      effect: "Whirlwind Slash DMG +60%"
    },
    "atk60-2": {
      name: "Enhanced Slash",
      effect: "Whirlwind Slash DMG +60%"
    },
    "blue-1": {
      name: "Whirlwind Slash Master",
      effect: "Whirlwind Slash DMG +100%"
    },
    "blue-2": {
      name: "Whirlwind Slash Combo II",
      effect: "Whirlwind Slash Count +2"
    },
    "blue-3": {
      name: "Great Whirlwind",
      effect: "Increases AoE and pulls nearby enemies"
    }
  },
  Pharaoh: {
    base: {
      name: "Summon: Pharaoh",
      effect: "Pulse Laser: Deals continuous DMG to all enemies in a line."
    },
    chain: {
      name: "Lightning Orb",
      effect: "Pulse Laser and Volt Fist hits generate Lightning Orbs"
    },
    "awakening-1": {
      name: "Sustained Laser",
      effect: "Laser Hit Count +5"
    },
    "awakening-2": {
      name: "Sustained Laser",
      effect: "Laser Hit Count +5"
    },
    "awakening-3": {
      name: "Powerful Laser",
      effect: "Laser AoE +100%"
    },
    "awakening-core": {
      name: "Ion Laser",
      effect: "Evolves into Ion Laser: DMG and AoE increases"
    },
    "white-1": {
      name: "Weakening Beam",
      effect: "Laser inflicts strong Slow"
    },
    "white-2": {
      name: "Disintegration Field",
      effect: "Enemies take +25% DMG"
    },
    "atk60-1": {
      name: "Laser Boost",
      effect: "Laser DMG +60%"
    },
    "atk60-2": {
      name: "Laser Boost",
      effect: "Laser DMG +60%"
    },
    "blue-1": {
      name: "Laser Master",
      effect: "Laser DMG +100%"
    },
    "blue-2": {
      name: "Forked Laser",
      effect: "Fires weaker lasers to the sides"
    },
    "blue-3": {
      name: "Overloaded Laser",
      effect: "Laser hit count doubles, but CD +1s"
    }
  },
  ID: {
    base: {
      name: "Summon: Ice Demon",
      effect: "Frost Summon: Summons Frost Troll to assist in battle for 10s. Frost Troll inherits 50% of Ice Demon's ATK and HP."
    },
    chain: {
      name: "Icicle Storm",
      effect: "Frost Summon's Summoned Unit and Ice Storm attacks generate massive Icicle Storm"
    },
    "awakening-1": {
      name: "Multi Summons",
      effect: "Frost Troll Count +1, Summon CD +1"
    },
    "awakening-2": {
      name: "Multi Summons",
      effect: "Frost Troll Count +1, Summon CD +1"
    },
    "awakening-3": {
      name: "Fast Summon",
      effect: "Summon CD -1s"
    },
    "awakening-core": {
      name: "Frost Legion",
      effect: "Evolves into Frost Legion: Adds Frost Bear for AoE attacks."
    },
    "white-1": {
      name: "Frost Summon",
      effect: "Summoning deals Ice DMG to nearby enemies"
    },
    "white-2": {
      name: "Glacio Enchantment",
      effect: "Summoned units' attacks inflict Freeze."
    },
    "atk60-1": {
      name: "Summon Boost",
      effect: "Summoned Unit DMG +60%"
    },
    "atk60-2": {
      name: "Summon Boost",
      effect: "Summoned Unit DMG +60%"
    },
    "blue-1": {
      name: "Summon Master",
      effect: "Summoned Unit DMG +100%"
    },
    "blue-2": {
      name: "Multi Summons II",
      effect: "Frost Troll Count +2"
    },
    "blue-3": {
      name: "Summon Duration",
      effect: "Frost Troll Duration +3s"
    }
  },
  DS: {
    base: {
      name: "Summon: Demon Spawn",
      effect: "Flame Blade: Slashes enemies with fire waves"
    },
    chain: {
      name: "Burning Ground",
      effect: "Flame Blade and Flame Arrow hits ignite Burning Ground"
    },
    "awakening-1": {
      name: "Flame Slash",
      effect: "Slash Count +5"
    },
    "awakening-2": {
      name: "Flame Slash",
      effect: "Slash Count +5"
    },
    "awakening-3": {
      name: "Quick Blade",
      effect: "Flame Blade CD -1s"
    },
    "awakening-core": {
      name: "Hell Slash",
      effect: "Evolves into Hell Slash: Ultra-fast slashes with fire waves."
    },
    "white-1": {
      name: "Flame Shockwave",
      effect: "Flame Blade may explode on hit"
    },
    "white-2": {
      name: "Shockwave DMG Bonus",
      effect: "Shockwave DMG +100%"
    },
    "atk60-1": {
      name: "Flame Blade DMG Bonus",
      effect: "Flame Blade DMG +60%"
    },
    "atk60-2": {
      name: "Flame Blade DMG Bonus",
      effect: "Flame Blade DMG +60%"
    },
    "blue-1": {
      name: "Flame Blade Master",
      effect: "Flame Blade DMG +100%"
    },
    "blue-2": {
      name: "Explosive Slash",
      effect: "Chance to launch Explosive Slash"
    },
    "blue-3": {
      name: "Flame Blast",
      effect: "Flame Blade AoE +50%"
    }
  },
  DH: {
    base: {
      name: "Summon: Demon Hunter",
      effect: "Musket Burst: Fires a barrage of projectiles at the nearest enemy."
    },
    chain: {
      name: "Scatter Shot",
      effect: "Musket Burst and Dart hits trigger Scatter Shot, attacking random enemies"
    },
    "awakening-1": {
      name: "Musket Burst",
      effect: "Projectile +2"
    },
    "awakening-2": {
      name: "Musket Burst",
      effect: "Projectile +2"
    },
    "awakening-3": {
      name: "Explosive Projectile",
      effect: "Projectiles may explode"
    },
    "awakening-core": {
      name: "Musket Frenzy",
      effect: "Evolves into Musket Frenzy: DMG, Penetration, and fire rate greatly increased."
    },
    "white-1": {
      name: "Breaking Projectile",
      effect: "Projectiles reduce enemy DEF"
    },
    "white-2": {
      name: "Bouncing Projectile",
      effect: "Projectiles bounce once"
    },
    "atk60-1": {
      name: "Musket Boost",
      effect: "Projectile DMG +60%"
    },
    "atk60-2": {
      name: "Musket Boost",
      effect: "Projectile DMG +60%"
    },
    "blue-1": {
      name: "Musket Boost II",
      effect: "Projectile DMG +100%"
    },
    "blue-2": {
      name: "Musket Burst II",
      effect: "Projectile +4"
    },
    "blue-3": {
      name: "Stunning Projectile",
      effect: "Projectile explosion stuns enemies"
    }
  },
  Cat: {
    base: {
      name: "Summon: Cat",
      effect: "Dart: Throws darts at the nearest enemies"
    },
    chain: {
      name: "Scatter Shot",
      effect: "Musket Burst and Dart hits trigger Scatter Shot, attacking random enemies"
    },
    "awakening-1": {
      name: "Dart Mastery",
      effect: "Dart CD -25%"
    },
    "awakening-2": {
      name: "Dart Barrage",
      effect: "Dart +1"
    },
    "awakening-3": {
      name: "Dart Barrage",
      effect: "Dart +1"
    },
    "awakening-core": {
      name: "Explosive Dart",
      effect: "Evolves into Explosive Dart: Splits into smaller darts on hit."
    },
    "white-1": {
      name: "Backup Dart",
      effect: "Chance to throw 3 revolver darts"
    },
    "white-2": {
      name: "Just In Case",
      effect: "Backup Dart +3"
    },
    "atk60-1": {
      name: "Dart Boost",
      effect: "Dart DMG +60%"
    },
    "atk60-2": {
      name: "Dart Boost",
      effect: "Dart DMG +60%"
    },
    "blue-1": {
      name: "Dart Master",
      effect: "Dart DMG +100%"
    },
    "blue-2": {
      name: "Dart Mastery II",
      effect: "Dart CD halved"
    },
    "blue-3": {
      name: "Dart Barrage II",
      effect: "Dart +2"
    }
  },
  IM: {
    base: {
      name: "Summon: Ice Mage",
      effect: "Frost Nova: Deals AoE DMG to random enemies."
    },
    chain: {
      name: "Ice Shard",
      effect: "Frost Nova and Icicle Sweep spawn Ice Shards"
    },
    "awakening-1": {
      name: "Frost Duration",
      effect: "Frost Nova Duration +2s"
    },
    "awakening-2": {
      name: "Frost Duration",
      effect: "Frost Nova Duration +2s"
    },
    "awakening-3": {
      name: "Frost Boost",
      effect: "Frost Nova AoE Up"
    },
    "awakening-core": {
      name: "Super Frost Nova",
      effect: "Evolves into Super Frost Nova: DMG increases, Invincible during cast."
    },
    "white-1": {
      name: "Quick Frost",
      effect: "Frost Nova CD -1s"
    },
    "white-2": {
      name: "Ice Shard Growth",
      effect: "Frost Nova may spawn Ice Shards on hit"
    },
    "atk60-1": {
      name: "Frost DMG Bonus",
      effect: "Frost Nova DMG +60%"
    },
    "atk60-2": {
      name: "Frost DMG Bonus",
      effect: "Frost Nova DMG +60%"
    },
    "blue-1": {
      name: "Frost Boost II",
      effect: "Frost Nova DMG +100%"
    },
    "blue-2": {
      name: "Twin Nova",
      effect: "Cast Frost Nova twice. CD +1s"
    },
    "blue-3": {
      name: "Frostbite",
      effect: "Frost Nova freezes enemies"
    }
  },
  Seraph: {
    base: {
      name: "Summon: Seraph",
      effect: "Thunderfall: Calls down lightning to strike random enemies. Each bolt has a chance to heal allies. Healing scales with Seraph's ATK."
    },
    chain: {
      name: "Conductive",
      effect: "Casting Thunderfall or Spinning Orb triggers Conductive"
    },
    "awakening-1": {
      name: "Conductive Bolt",
      effect: "Thunderbolt triggers Lightning Arcs"
    },
    "awakening-2": {
      name: "Multi Thunderbolt",
      effect: "Thunderbolt Count +1"
    },
    "awakening-3": {
      name: "Multi Thunderbolt",
      effect: "Thunderbolt Count +1"
    },
    "awakening-core": {
      name: "Judgment Thunder",
      effect: "Evolves into Judgment Thunder: DMG increases, more Lightning Arcs."
    },
    "white-1": {
      name: "Thunderbolt Boost",
      effect: "Thunderbolt AoE Up"
    },
    "white-2": {
      name: "EM Field",
      effect: "Generate EM Field that deals DoT"
    },
    "atk60-1": {
      name: "Thunderbolt DMG Bonus",
      effect: "Thunderbolt DMG +60%"
    },
    "atk60-2": {
      name: "Thunderbolt DMG Bonus",
      effect: "Thunderbolt DMG +60%"
    },
    "blue-1": {
      name: "Thunder Master",
      effect: "Thunderbolt DMG +100%"
    },
    "blue-2": {
      name: "Multi Thunderbolt II",
      effect: "Thunderbolt Count +2"
    },
    "blue-3": {
      name: "Thunderwrath",
      effect: "Kills trigger extra single-target Thunderbolt"
    }
  },
  HP: {
    base: {
      name: "Summon: Holy Priest",
      effect: "Spinning Orb: Releases rotating lightning orbs around."
    },
    chain: {
      name: "Conductive",
      effect: "Casting Thunderfall or Spinning Orb triggers Conductive"
    },
    "awakening-1": {
      name: "Multi Orbs",
      effect: "Orb Count +1"
    },
    "awakening-2": {
      name: "Orb Boost",
      effect: "Orb Size Up"
    },
    "awakening-3": {
      name: "Multi Orbs",
      effect: "Orb Count +1"
    },
    "awakening-core": {
      name: "Supercharged",
      effect: "Evolves into Supercharged: DMG increases, Orbit +1"
    },
    "white-1": {
      name: "Paralyzing Orb",
      effect: "Orb DMG +30% with Paralysis"
    },
    "white-2": {
      name: "Orb Speed Up",
      effect: "Orb SPD Up"
    },
    "atk60-1": {
      name: "Orb DMG Bonus",
      effect: "Orb DMG +60%"
    },
    "atk60-2": {
      name: "Orb DMG Bonus",
      effect: "Orb DMG +60%"
    },
    "blue-1": {
      name: "Orb Master",
      effect: "Orb DMG +100%"
    },
    "blue-2": {
      name: "Infinite Orb",
      effect: "Removes Orb CD, but SPD reduced"
    },
    "blue-3": {
      name: "Shocking Orb",
      effect: "Orbs may instakill non-boss enemies"
    }
  },
  FM: {
    base: {
      name: "Summon: Fire Mage",
      effect: "Bounder: Release Boulders to crush enemies in a line."
    },
    chain: {
      name: "Fireball Splash",
      effect: "Boulder and Meteor generate Splash Fireballs"
    },
    "awakening-1": {
      name: "Heavy Boulder",
      effect: "Boulder stuns enemies for 3s"
    },
    "awakening-2": {
      name: "Multi Boulders",
      effect: "Boulder Count +1"
    },
    "awakening-3": {
      name: "Multi Boulders",
      effect: "Boulder Count +1"
    },
    "awakening-core": {
      name: "Giant Boulder",
      effect: "Evolves into Giant Boulder: DMG increases with continuous explosions."
    },
    "white-1": {
      name: "Boulder Speed Up",
      effect: "Boulder CD -10%"
    },
    "white-2": {
      name: "Boulder Assault",
      effect: "Boulder SPD Up with stronger knockback"
    },
    "atk60-1": {
      name: "Boulder DMG Bonus",
      effect: "Boulder DMG +60%"
    },
    "atk60-2": {
      name: "Boulder DMG Bonus",
      effect: "Boulder DMG +60%"
    },
    "blue-1": {
      name: "Boulder Master",
      effect: "Boulder DMG +100%"
    },
    "blue-2": {
      name: "Boulder Burst",
      effect: "Boulder CD -25%"
    },
    "blue-3": {
      name: "Backup Boulder",
      effect: "Counter with boulder when attacked. CD: 6s"
    }
  },
  IW: {
    base: {
      name: "Summon: Ice Witch",
      effect: "Icicle Sweep: Fires rotating icicles to sweep enemies"
    },
    chain: {
      name: "Ice Shard",
      effect: "Frost Nova and Icicle Sweep spawn Ice Shards"
    },
    "awakening-1": {
      name: "Multi Icicles",
      effect: "Icicle Trajectory +1"
    },
    "awakening-2": {
      name: "Multi Icicles",
      effect: "Icicle Trajectory +1"
    },
    "awakening-3": {
      name: "Icicle Boost",
      effect: "Icicle range increases with knockback"
    },
    "awakening-core": {
      name: "Icicle Frenzy",
      effect: "Evolves into Icicle Frenzy: DMG increases, CRIT Rate greatly increases."
    },
    "white-1": {
      name: "Icicle Barrage",
      effect: "Icicle Count +6"
    },
    "white-2": {
      name: "Icicle Penetration",
      effect: "Icicle Penetration +2"
    },
    "atk60-1": {
      name: "Icicle DMG Bonus",
      effect: "Icicle DMG +60%"
    },
    "atk60-2": {
      name: "Icicle DMG Bonus",
      effect: "Icicle DMG +60%"
    },
    "blue-1": {
      name: "Icicle Master",
      effect: "Icicle DMG +80%"
    },
    "blue-2": {
      name: "Icicle Barrage II",
      effect: "Icicle Count +12"
    },
    "blue-3": {
      name: "Extreme Icicle",
      effect: "Icicle inflicts Slow"
    }
  },
  FW: {
    base: {
      name: "Summon: Flame Wizard",
      effect: "Meteor: Summons meteors at random locations."
    },
    chain: {
      name: "Fireball Splash",
      effect: "Boulder and Meteor generate Splash Fireballs"
    },
    "awakening-1": {
      name: "Meteor Ignition",
      effect: "Meteors ignite the ground"
    },
    "awakening-2": {
      name: "Meteor Burst",
      effect: "Meteor Count +1"
    },
    "awakening-3": {
      name: "Meteor Burst",
      effect: "Meteor Count +1"
    },
    "awakening-core": {
      name: "Meteor Rain",
      effect: "Evolves into Meteor Rain: DMG increases and summons large AoE Meteor shower."
    },
    "white-1": {
      name: "Fast Meteor",
      effect: "Meteor DMG +20%, CD -10%"
    },
    "white-2": {
      name: "Meteor Enlarge",
      effect: "Meteor Size Up"
    },
    "atk60-1": {
      name: "Meteor DMG Bonus",
      effect: "Meteor DMG +60%"
    },
    "atk60-2": {
      name: "Meteor DMG Bonus",
      effect: "Meteor DMG +60%"
    },
    "blue-1": {
      name: "Astrology Master",
      effect: "Meteor DMG +100%"
    },
    "blue-2": {
      name: "Meteor Smash",
      effect: "Meteors stun enemies for 1s, DMG +30%"
    },
    "blue-3": {
      name: "Meteor Barrage",
      effect: "Meteor Count +2"
    }
  }
};
