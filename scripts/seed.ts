/**
 * Seeds a demo venue ("Café Sofra", slug: demo) with a full bilingual menu,
 * 8 tables and an admin user. Run with: npm run db:seed
 */
import { prisma } from "../src/lib/db";
import { addTables, createCategory, createItem, getVenueBySlug, type ItemPayload } from "../src/lib/repo";
import { hashPassword } from "../src/lib/password";

async function main() {
  const t2 = (tr: string, en: string) => JSON.stringify({ tr, en });
  const TRY = (v: number) => Math.round(v * 100);

  if (await getVenueBySlug("demo")) {
    console.log("Demo venue already exists, nothing to do. (Delete data/sofra.db to reseed.)");
    return;
  }

  const venue = await prisma.venue.create({
    data: {
      slug: "demo",
      name: "Café Sofra",
      welcomeJson: t2("Demo menümüze hoş geldiniz!", "Welcome to our demo menu!"),
      currency: "TRY",
      languages: "tr,en",
      defaultLang: "tr",
      themePrimary: "#c2410c",
      themeMode: "auto",
      phone: "+90 000 000 00 00",
      whatsapp: "+90 000 000 00 00",
      instagram: "@sofra",
      hours: "09:00–22:00",
    },
  });
  const venueId = venue.id;

  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@sofra.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "sofra123";
  await prisma.user.create({
    data: {
      email: adminEmail.toLowerCase(),
      passwordHash: hashPassword(adminPassword),
      name: "Demo Admin",
      role: "owner",
      venueId,
    },
  });

  await addTables(venueId, 8);

  /* ---- categories ---- */
  const breakfast = await createCategory(venueId, t2("Kahvaltı", "Breakfast"), null);
  const starters = await createCategory(venueId, t2("Başlangıçlar", "Starters"), null);
  const mains = await createCategory(venueId, t2("Ana Yemekler", "Mains"), null);
  const kebabs = await createCategory(venueId, t2("Kebaplar", "Kebabs"), mains.id);
  const homeCooking = await createCategory(venueId, t2("Ev Yemekleri", "Home Cooking"), mains.id);
  const desserts = await createCategory(venueId, t2("Tatlılar", "Desserts"), null);
  const drinks = await createCategory(venueId, t2("İçecekler", "Drinks"), null);
  const teas = await createCategory(venueId, t2("Çaylar", "Tea"), drinks.id);
  const juices = await createCategory(venueId, t2("Taze Sıkma", "Juices"), drinks.id);
  const coffees = await createCategory(venueId, t2("Kahveler", "Coffees"), null);
  const hotCoffee = await createCategory(venueId, t2("Sıcak", "Hot"), coffees.id);
  const coldCoffee = await createCategory(venueId, t2("Soğuk", "Cold"), coffees.id);

  const menu: ItemPayload[] = [];
  const add = (p: ItemPayload) => menu.push(p);

  /* ---- breakfast ---- */
  add({
    categoryId: breakfast.id, nameJson: t2("Serpme kahvaltı (2 kişilik)", "Spread breakfast (for 2)"),
    descJson: t2("Peynirler, zeytinler, bal & kaymak, reçeller, sıcak ekmek.", "Cheeses, olives, honey & clotted cream, jams, warm bread."),
    priceMinor: TRY(650), emoji: "🍳", prepMinutes: 20, tags: "popular,vegetarian",
  });
  add({
    categoryId: breakfast.id, nameJson: t2("Menemen", "Menemen"),
    descJson: t2("Bakır tavada domates, biber, yumurta.", "Tomato, pepper, eggs in a copper pan."),
    priceMinor: TRY(180), emoji: "🍅", prepMinutes: 12, tags: "vegetarian",
    optionGroups: [{
      nameJson: t2("Ekstralar", "Extras"), type: "multi",
      choices: [
        { nameJson: t2("Sucuklu", "With sujuk"), priceDelta: TRY(40) },
        { nameJson: t2("Ekstra peynir", "Extra cheese"), priceDelta: TRY(30) },
        { nameJson: t2("Ekstra ekmek", "Extra bread"), priceDelta: TRY(10) },
      ],
    }],
  });
  add({
    categoryId: breakfast.id, nameJson: t2("Bal & kaymak", "Honey & clotted cream"),
    descJson: t2("Süzme kaymak, çiçek balı, taze ekmek.", "Strained clotted cream, blossom honey, fresh bread."),
    priceMinor: TRY(160), emoji: "🍯", prepMinutes: 5, tags: "vegetarian",
  });
  add({
    categoryId: breakfast.id, nameJson: t2("Simit & peynir tabağı", "Simit & cheese plate"),
    descJson: t2("Susamlı simit, beyaz peynir, domates, salatalık.", "Sesame simit, white cheese, tomato, cucumber."),
    priceMinor: TRY(120), emoji: "🥯", prepMinutes: 5, tags: "vegetarian",
  });

  /* ---- starters ---- */
  add({
    categoryId: starters.id, nameJson: t2("Mercimek çorbası", "Lentil soup"),
    descJson: t2("Kırmızı mercimek, limon, sıcak bazlama.", "Red lentil soup, lemon, warm flatbread."),
    priceMinor: TRY(90), emoji: "🍲", prepMinutes: 8, tags: "popular,vegetarian",
  });
  add({
    categoryId: starters.id, nameJson: t2("Mevsim salatası", "Seasonal salad"),
    descJson: t2("Domates, salatalık, taze fesleğen, nar ekşisi.", "Tomato, cucumber, fresh basil, pomegranate molasses."),
    priceMinor: TRY(150), emoji: "🥗", prepMinutes: 7, tags: "vegetarian,vegan",
  });
  add({
    categoryId: starters.id, nameJson: t2("Humus", "Hummus"),
    descJson: t2("Nohut, tahin, zeytinyağı, kimyon.", "Chickpea, tahini, olive oil, cumin."),
    priceMinor: TRY(130), emoji: "🧆", prepMinutes: 5, tags: "vegetarian,vegan,glutenfree",
  });
  add({
    categoryId: starters.id, nameJson: t2("Sigara böreği", "Cheese rolls"),
    descJson: t2("Çıtır yufka, beyaz peynir, maydanoz.", "Crispy pastry, white cheese, parsley."),
    priceMinor: TRY(140), emoji: "🥟", prepMinutes: 12, tags: "vegetarian",
  });

  /* ---- mains / kebabs ---- */
  add({
    categoryId: kebabs.id, nameJson: t2("Adana kebap", "Adana kebab"),
    descJson: t2("Zırhla çekilmiş kuzu eti, közlenmiş biber, bulgur pilavı.", "Hand-minced lamb, grilled peppers, bulgur pilaf."),
    priceMinor: TRY(320), emoji: "🍢", prepMinutes: 18, tags: "popular,spicy",
    optionGroups: [{
      nameJson: t2("Porsiyon", "Portion"), type: "single", required: true,
      choices: [
        { nameJson: t2("Yarım", "Half"), priceAbsolute: TRY(220) },
        { nameJson: t2("Tam", "Full"), priceAbsolute: TRY(320) },
        { nameJson: t2("1,5 porsiyon", "1.5 portion"), priceAbsolute: TRY(450) },
      ],
    }],
  });
  add({
    categoryId: kebabs.id, nameJson: t2("Tavuk şiş", "Chicken shish"),
    descJson: t2("Marine tavuk, ızgara sebze, lavaş.", "Marinated chicken, grilled vegetables, flatbread."),
    priceMinor: TRY(300), emoji: "🍗", prepMinutes: 18,
  });

  /* ---- mains / home cooking ---- */
  add({
    categoryId: homeCooking.id, nameJson: t2("Köfte & patates", "Meatballs & fries"),
    descJson: t2("Izgara köfte, el yapımı patates, közlenmiş domates.", "Grilled meatballs, hand-cut fries, roasted tomato."),
    priceMinor: TRY(290), emoji: "🍖", prepMinutes: 15, tags: "popular",
    optionGroups: [{
      nameJson: t2("Yanında", "On the side"), type: "single",
      choices: [
        { nameJson: t2("El yapımı patates", "Hand-cut fries") },
        { nameJson: t2("Bulgur pilavı", "Bulgur pilaf") },
        { nameJson: t2("Mevsim salatası", "Seasonal salad") },
      ],
    }],
  });
  add({
    categoryId: homeCooking.id, nameJson: t2("Tavuk şinitzel", "Chicken schnitzel"),
    descJson: t2("Çıtır pane tavuk, parmesan, limon.", "Crispy breaded chicken, parmesan, lemon."),
    priceMinor: TRY(280), emoji: "🍗", prepMinutes: 15,
  });
  add({
    categoryId: homeCooking.id, nameJson: t2("Izgara tavuk", "Grilled chicken"),
    descJson: t2("Marine tavuk göğsü, ızgara sebze, pilav.", "Marinated chicken breast, grilled vegetables, rice."),
    priceMinor: TRY(260), emoji: "🔥", prepMinutes: 18, tags: "glutenfree",
  });
  add({
    categoryId: homeCooking.id, nameJson: t2("Sebzeli güveç", "Vegetable casserole"),
    descJson: t2("Fırında mevsim sebzeleri, zeytinyağı.", "Oven-baked seasonal vegetables, olive oil."),
    priceMinor: TRY(230), emoji: "🥘", prepMinutes: 20, tags: "vegetarian,vegan",
  });

  /* ---- desserts ---- */
  add({
    categoryId: desserts.id, nameJson: t2("Magnolya", "Magnolia pudding"),
    descJson: t2("Muzlu, bisküvili katmanlı sütlü tatlı.", "Layered milk pudding with banana and biscuit."),
    priceMinor: TRY(130), emoji: "🍮", prepMinutes: 5, tags: "popular,vegetarian",
  });
  add({
    categoryId: desserts.id, nameJson: t2("Fıstıklı baklava", "Pistachio baklava"),
    descJson: t2("Antep fıstığı, el açması yufka, tereyağı.", "Pistachio, layered filo, butter."),
    priceMinor: TRY(180), emoji: "🍰", prepMinutes: 5, tags: "popular,vegetarian",
  });
  add({
    categoryId: desserts.id, nameJson: t2("Profiterol", "Profiteroles"),
    descJson: t2("Krema dolgulu topçuklar, çikolata sosu.", "Cream-filled choux puffs in chocolate sauce."),
    priceMinor: TRY(140), emoji: "🍫", prepMinutes: 5, tags: "vegetarian",
  });
  add({
    categoryId: desserts.id, nameJson: t2("Brownie & dondurma", "Brownie & ice cream"),
    descJson: t2("Sıcak brownie, vanilyalı dondurma.", "Warm brownie, vanilla ice cream."),
    priceMinor: TRY(140), emoji: "🍨", prepMinutes: 8, tags: "vegetarian",
  });

  /* ---- drinks ---- */
  add({
    categoryId: drinks.id, nameJson: t2("Ayran", "Ayran"),
    descJson: t2("Ev yapımı, bol köpüklü.", "House-made, frothy."),
    priceMinor: TRY(45), emoji: "🥛", tags: "vegetarian",
  });
  add({
    categoryId: drinks.id, nameJson: t2("Kola", "Cola"),
    descJson: t2("Kutu, buz gibi servis.", "Can, served ice-cold."),
    priceMinor: TRY(60), emoji: "🥤", tags: "vegetarian,vegan",
  });
  add({
    categoryId: drinks.id, nameJson: t2("Buzlu çay", "Iced tea"),
    descJson: t2("Şeftali veya limon, kutu.", "Peach or lemon, canned."),
    priceMinor: TRY(60), emoji: "🧋", tags: "vegetarian,vegan",
    optionGroups: [{
      nameJson: t2("Aroma", "Flavour"), type: "single",
      choices: [{ nameJson: t2("Şeftali", "Peach") }, { nameJson: t2("Limon", "Lemon") }],
    }],
  });
  add({
    categoryId: drinks.id, nameJson: t2("Soda", "Sparkling water"),
    descJson: t2("Sade veya meyveli.", "Plain or fruit-flavoured."),
    priceMinor: TRY(50), emoji: "🫧", tags: "vegetarian,vegan",
  });
  add({
    categoryId: teas.id, nameJson: t2("Çay", "Tea"),
    descJson: t2("Demleme, klasik ince belli bardak.", "Brewed, classic tulip glass."),
    priceMinor: TRY(30), emoji: "🫖", tags: "vegetarian,vegan",
  });
  add({
    categoryId: teas.id, nameJson: t2("Bitki çayı", "Herbal tea"),
    descJson: t2("Ihlamur, nane-limon veya adaçayı.", "Linden, mint-lemon or sage."),
    priceMinor: TRY(45), emoji: "🍵", tags: "vegetarian,vegan",
  });
  add({
    categoryId: juices.id, nameJson: t2("Taze portakal suyu", "Fresh orange juice"),
    descJson: t2("Her gün taze sıkım.", "Squeezed daily."),
    priceMinor: TRY(95), emoji: "🍊", tags: "vegetarian,vegan",
  });
  add({
    categoryId: juices.id, nameJson: t2("Limonata", "Lemonade"),
    descJson: t2("Taze limon, nane.", "Fresh lemon, mint."),
    priceMinor: TRY(80), emoji: "🍋", tags: "popular,vegetarian,vegan",
  });

  /* ---- coffees ---- */
  add({
    categoryId: hotCoffee.id, nameJson: t2("Türk kahvesi", "Turkish coffee"),
    descJson: t2("Közde pişirilir, lokum ile servis edilir.", "Cooked on embers, served with Turkish delight."),
    priceMinor: TRY(75), emoji: "☕", prepMinutes: 5, tags: "vegetarian",
    optionGroups: [{
      nameJson: t2("Şeker", "Sugar level"), type: "single",
      choices: [
        { nameJson: t2("Sade", "Plain") },
        { nameJson: t2("Az şekerli", "Low sugar") },
        { nameJson: t2("Şekerli", "Sweet") },
      ],
    }],
  });
  add({
    categoryId: hotCoffee.id, nameJson: t2("Latte", "Latte"),
    descJson: t2("Espresso, buharda ısıtılmış süt.", "Espresso, steamed milk."),
    priceMinor: TRY(95), emoji: "🥛", tags: "vegetarian",
    optionGroups: [
      {
        nameJson: t2("Boyut", "Size"), type: "single", required: true,
        choices: [
          { nameJson: t2("Küçük", "Small"), priceAbsolute: TRY(80) },
          { nameJson: t2("Orta", "Medium"), priceAbsolute: TRY(95) },
          { nameJson: t2("Büyük", "Large"), priceAbsolute: TRY(110) },
        ],
      },
      {
        nameJson: t2("Ekstralar", "Extras"), type: "multi",
        choices: [
          { nameJson: t2("Ekstra shot", "Extra shot"), priceDelta: TRY(15) },
          { nameJson: t2("Yulaf sütü", "Oat milk"), priceDelta: TRY(20) },
        ],
      },
    ],
  });
  add({
    categoryId: coldCoffee.id, nameJson: t2("Buzlu kahve", "Iced coffee"),
    descJson: t2("Espresso, buz, süt.", "Espresso, ice, milk."),
    priceMinor: TRY(110), emoji: "🧊", tags: "vegetarian",
  });

  // Sequential: createItem derives each item's `sort` from the current max in its category.
  for (const p of menu) await createItem(venueId, p);

  console.log("✓ Seeded demo venue 'Café Sofra'");
  console.log(`  Guest menu : /m/demo?table=1`);
  console.log(`  Staff panel: /admin  (${adminEmail} / ${adminPassword})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
