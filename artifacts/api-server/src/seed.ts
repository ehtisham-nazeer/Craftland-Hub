import { db } from "@workspace/db";
import {
  mapsTable,
  creatorsTable,
} from "@workspace/db";

async function seed() {
  console.log("Seeding database...");

  // Creators
  const creatorData = [
    {
      name: "FreeFire BD",
      logo: "https://picsum.photos/seed/ffbd/200",
      bio: "Official Bangladesh CraftLand creators",
      region: "Bangladesh",
      social: "https://youtube.com",
      totalMaps: 0,
      totalLikes: 0,
    },
    {
      name: "CraftMaster ID",
      logo: "https://picsum.photos/seed/cmid/200",
      bio: "Top Indonesian CraftLand designers",
      region: "Indonesia",
      social: "https://youtube.com",
      totalMaps: 0,
      totalLikes: 0,
    },
    {
      name: "FF India Official",
      logo: "https://picsum.photos/seed/ffin/200",
      bio: "India's premier map creators",
      region: "India",
      social: "https://youtube.com",
      totalMaps: 0,
      totalLikes: 0,
    },
    {
      name: "MENA Creators",
      logo: "https://picsum.photos/seed/mena/200",
      bio: "Creative builders from the MENA region",
      region: "MENA",
      social: "https://youtube.com",
      totalMaps: 0,
      totalLikes: 0,
    },
    {
      name: "SG Pro Builders",
      logo: "https://picsum.photos/seed/sgpro/200",
      bio: "Singapore's finest CraftLand architects",
      region: "Singapore",
      social: "https://youtube.com",
      totalMaps: 0,
      totalLikes: 0,
    },
  ];

  const insertedCreators = await db.insert(creatorsTable).values(creatorData).returning().onConflictDoNothing();
  console.log(`Inserted ${insertedCreators.length} creators`);

  if (insertedCreators.length === 0) {
    const existing = await db.select().from(creatorsTable).limit(5);
    if (existing.length > 0) {
      console.log("Using existing creators for maps...");
      await seedMaps(existing.map((c) => c.id));
    }
    return;
  }

  await seedMaps(insertedCreators.map((c: { id: number }) => c.id));
}

async function seedMaps(creatorIds: number[]) {
  const mapNames = [
    { name: "Zombie Survival Arena", tags: ["survival", "zombie", "horror"] },
    { name: "Rainbow Race Track", tags: ["racing", "fun", "colorful"] },
    { name: "Sky Bridge Challenge", tags: ["parkour", "challenge", "sky"] },
    { name: "Battle Royale Mini", tags: ["battle", "competitive", "mini"] },
    { name: "Mystic Forest Escape", tags: ["escape", "puzzle", "forest"] },
    { name: "Dragon's Lair", tags: ["adventure", "dragon", "fantasy"] },
    { name: "Sniper Tower Wars", tags: ["sniper", "pvp", "tower"] },
    { name: "Neon City Chase", tags: ["city", "neon", "chase"] },
    { name: "Ice Kingdom Raid", tags: ["ice", "raid", "winter"] },
    { name: "Desert Storm", tags: ["desert", "storm", "survival"] },
    { name: "Volcano Rush", tags: ["volcano", "rush", "lava"] },
    { name: "Galaxy Space Jump", tags: ["space", "parkour", "galaxy"] },
    { name: "Ancient Temple Run", tags: ["temple", "run", "adventure"] },
    { name: "Ocean Floor Battle", tags: ["ocean", "underwater", "battle"] },
    { name: "Cyberpunk Warehouse", tags: ["cyberpunk", "warehouse", "pvp"] },
    { name: "Pirate Cove", tags: ["pirate", "sea", "exploration"] },
    { name: "Arctic Survival", tags: ["arctic", "survival", "cold"] },
    { name: "Haunted Mansion", tags: ["horror", "haunted", "mansion"] },
    { name: "Speed Run Factory", tags: ["speedrun", "factory", "race"] },
    { name: "Kingdom Defense", tags: ["defense", "strategy", "kingdom"] },
  ];

  const regions = ["Bangladesh", "India", "Indonesia", "LATAM", "MENA", "Pakistan", "Singapore", "Thailand", "Vietnam"];

  const mapsData = mapNames.map((m, i) => ({
    name: m.name,
    code: `CL${String(1000 + i).padStart(4, "0")}`,
    image: `https://picsum.photos/seed/map${i}/800/450`,
    mapLink: `https://ff.garena.com/craftland`,
    description: `An exciting ${m.name} map for Free Fire CraftLand. Play with friends and test your skills!`,
    creatorId: creatorIds[i % creatorIds.length],
    region: regions[i % regions.length],
    tags: m.tags,
    likes: Math.floor(Math.random() * 5000) + 100,
    views: Math.floor(Math.random() * 50000) + 1000,
    isFeatured: i < 3,
    isTrending: i >= 3 && i < 8,
    isActive: true,
  }));

  const insertedMaps = await db.insert(mapsTable).values(mapsData).returning().onConflictDoNothing();
  console.log(`Inserted ${insertedMaps.length} maps`);
}

seed()
  .then(() => { console.log("Done!"); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); });
