const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const ui = {
  coreHealth: document.getElementById("coreHealth"),
  heroHealth: document.getElementById("heroHealth"),
  essence: document.getElementById("essence"),
  wave: document.getElementById("wave"),
  mana: document.getElementById("mana"),
  enemies: document.getElementById("enemies"),
  selectedUnit: document.getElementById("selectedUnit"),
  messageBox: document.getElementById("messageBox"),
  buttons: [...document.querySelectorAll(".legend-button")],
};

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const GRAVITY = 0.46;
const FLOOR_Y = HEIGHT - 86;

const staticSpriteSources = {
  warrior: "./assets/defenders/warrior.png",
  archer: "./assets/defenders/archer.png",
  mage: "./assets/defenders/mage.png",
};

const staticSprites = Object.fromEntries(
  Object.entries(staticSpriteSources).map(([key, source]) => {
    const image = new Image();
    image.src = source;
    return [key, image];
  }),
);

const animationSources = {
  warrior_idle: "./assets/defenders/warrior_idle.png",
  warrior_attack: "./assets/defenders/warrior_attack.png",
  archer_idle: "./assets/defenders/archer_idle.png",
  archer_attack: "./assets/defenders/archer_attack.png",
  mage_idle: "./assets/defenders/mage_idle.png",
  mage_attack: "./assets/defenders/mage_attack.png",
  hero_idle: "./assets/hero/hero_idle.png",
  hero_walk: "./assets/hero/hero_walk.png",
  hero_run: "./assets/hero/hero_run.png",
  hero_jump: "./assets/hero/hero_jump.png",
  hero_hit: "./assets/hero/hero_hit.png",
  hero_defeat: "./assets/hero/hero_defeat.png",
  hero_melee: "./assets/hero/hero_melee.png",
  hero_magic: "./assets/hero/hero_magic.png",
  enemy_idle: "./assets/enemy/enemy_idle.png",
  enemy_fly: "./assets/enemy/enemy_fly.png",
  enemy_attack: "./assets/enemy/enemy_attack.png",
  enemy_hit: "./assets/enemy/enemy_hit.png",
  enemy_defeat: "./assets/enemy/enemy_defeat.png",
};

const animationSheets = Object.fromEntries(
  Object.entries(animationSources).map(([key, source]) => {
    const image = new Image();
    image.src = source;
    return [key, image];
  }),
);

const animationDefs = {
  warrior_idle: { frameWidth: 134, frameHeight: 134, fps: 8, loop: true },
  warrior_attack: { frameWidth: 134, frameHeight: 134, fps: 11.5, loop: false },
  archer_idle: { frameWidth: 138, frameHeight: 138, fps: 8, loop: true },
  archer_attack: { frameWidth: 138, frameHeight: 138, fps: 11.5, loop: false },
  mage_idle: { frameWidth: 108, frameHeight: 108, fps: 8, loop: true },
  mage_attack: { frameWidth: 108, frameHeight: 108, fps: 8, loop: false },
  hero_idle: { frameWidth: 92, frameHeight: 92, fps: 7, loop: true },
  hero_walk: { frameWidth: 92, frameHeight: 92, fps: 10, loop: true },
  hero_run: { frameWidth: 96, frameHeight: 92, fps: 12, loop: true },
  hero_jump: { frameWidth: 92, frameHeight: 92, fps: 8, loop: true },
  hero_hit: { frameWidth: 92, frameHeight: 92, fps: 12, loop: false },
  hero_defeat: { frameWidth: 92, frameHeight: 92, fps: 10, loop: false },
  hero_melee: { frameWidth: 92, frameHeight: 92, fps: 12, loop: false },
  hero_magic: { frameWidth: 92, frameHeight: 92, fps: 12, loop: false },
  enemy_idle: { frameWidth: 184, frameHeight: 184, fps: 7, loop: true },
  enemy_fly: { frameWidth: 184, frameHeight: 184, fps: 10, loop: true },
  enemy_attack: { frameWidth: 184, frameHeight: 184, fps: 11, loop: false },
  enemy_hit: { frameWidth: 184, frameHeight: 184, fps: 12, loop: false },
  enemy_defeat: { frameWidth: 184, frameHeight: 184, fps: 12, loop: false },
};

const defenderTypes = {
  warrior: {
    label: "Warrior",
    cost: 25,
    hp: 250,
    range: 74,
    damage: 8.5,
    cooldown: 0.85,
    color: "#f6b56b",
  },
  archer: {
    label: "Archer",
    cost: 35,
    hp: 64,
    range: 440,
    damage: 13.2,
    cooldown: 1.15,
    color: "#8fd8ff",
  },
  mage: {
    label: "Mage",
    cost: 45,
    hp: 34,
    range: 297,
    damage: 33.75,
    cooldown: 1.45,
    splash: 42,
    color: "#d7a9ff",
  },
};

const surfaces = [
  { x: 0, y: FLOOR_Y, width: WIDTH, height: HEIGHT - FLOOR_Y },
  { x: 140, y: 512, width: 245, height: 16 },
  { x: 456, y: 432, width: 252, height: 16 },
  { x: 828, y: 360, width: 220, height: 16 },
  { x: 828, y: 532, width: 210, height: 16 },
];

const game = {
  time: 0,
  dt: 0,
  lastTime: 0,
  running: true,
  wave: 1,
  totalWaves: 7,
  prepDuration: 15,
  prepTimer: 15,
  essence: 100,
  core: {
    x: 210,
    y: FLOOR_Y - 30,
    radius: 32,
    hp: 250,
    maxHp: 250,
  },
  selectedType: "warrior",
  mouse: { x: 0, y: 0 },
  keys: {},
  summon: {
    holdDuration: 2,
    charge: 0,
    placement: null,
    lockedUntilRelease: false,
  },
  reviveAll: {
    holdDuration: 1,
    charge: 0,
    triggered: false,
  },
  hero: null,
  defenders: [],
  enemies: [],
  projectiles: [],
  effects: [],
  message: "The next wave is gathering above the valley.",
  messageTimer: 4,
  waveSpawned: 0,
  waveSpawnTarget: 9,
  spawnAccumulator: 0,
  gameOver: false,
  victory: false,
};

function createHero() {
  return {
    x: 248,
    y: FLOOR_Y - 82,
    width: 28,
    height: 58,
    vx: 0,
    vy: 0,
    facing: 1,
    walkSpeed: 3.1,
    runSpeed: 5.15,
    jumpStrength: 8.9,
    jumpBoostTimer: 0,
    jumpBoostDuration: 0.032,
    jumpHangTimer: 0,
    jumpHangDuration: 0.055,
    jumpAnimElapsed: 0,
    landingAnimTimer: 0,
    landingAnimDuration: 0.12,
    onGround: false,
    hp: 170,
    maxHp: 170,
    mana: 90,
    maxMana: 90,
    strikeCooldown: 0,
    spellCooldown: 0,
    reviveCooldown: 0,
    invuln: 0,
    meleeAnimTimer: 0,
    magicAnimTimer: 0,
    hitAnimTimer: 0,
    animName: "idle",
    animTime: 0,
  };
}

function createDefender(type, x, y) {
  const config = defenderTypes[type];
  return {
    type,
    x,
    y,
    width: 24,
    height: 38,
    hp: config.hp,
    maxHp: config.hp,
    cooldown: Math.random() * config.cooldown,
    fallen: false,
    fallenTimer: 0,
    facing: 1,
    attacking: false,
    attackAnimElapsed: 0,
    attackResolved: false,
    attackTarget: null,
    animTime: Math.random() * 0.8,
  };
}

function createEnemy(wave) {
  const variant = Math.random() < 0.25 ? "harrier" : "skirmisher";
  return {
    kind: variant,
    x: WIDTH + 80 + Math.random() * 180,
    y: 120 + Math.random() * 320,
    width: 34,
    height: 44,
    vx: -(1.1 + wave * 0.06 + Math.random() * 0.55),
    vy: 0,
    hp: variant === "harrier" ? 58 + wave * 7 : 42 + wave * 6,
    maxHp: variant === "harrier" ? 58 + wave * 7 : 42 + wave * 6,
    damage: variant === "harrier" ? 13 : 9,
    attackCooldown: 0,
    bobOffset: Math.random() * Math.PI * 2,
    targetMode: Math.random() < 0.45 ? "defender" : "core",
    hitAnimTimer: 0,
    attackAnimTimer: 0,
    dead: false,
    deathTimer: 0,
    animName: "fly",
    animTime: Math.random() * 0.6,
    facing: -1,
  };
}

function addEffect(type, x, y, color, life = 0.4, extra = {}) {
  game.effects.push({
    type,
    x,
    y,
    color,
    life,
    maxLife: life,
    radius: extra.radius || 16,
    text: extra.text || "",
  });
}

function showMessage(text, duration = 3.2) {
  game.message = text;
  game.messageTimer = duration;
  ui.messageBox.textContent = text;
}

function setSelectedType(type) {
  game.selectedType = type;
  for (const button of ui.buttons) {
    button.classList.toggle("active", button.dataset.type === type);
  }
  ui.selectedUnit.textContent = `Selected: ${defenderTypes[type].label}`;
}

function isPrepPhase() {
  return game.prepTimer > 0;
}

function heroCenter() {
  return {
    x: game.hero.x + game.hero.width / 2,
    y: game.hero.y + game.hero.height / 2,
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function staticSpriteReady(name) {
  const sprite = staticSprites[name];
  return Boolean(sprite && sprite.complete && sprite.naturalWidth > 0);
}

function drawStaticSprite(name, x, y, width, height, options = {}) {
  const sprite = staticSprites[name];
  if (!staticSpriteReady(name)) {
    return false;
  }

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2);
  ctx.scale(options.flipX ? -1 : 1, 1);
  if (options.rotation) {
    ctx.rotate(options.rotation);
  }
  ctx.globalAlpha = options.alpha ?? 1;
  ctx.drawImage(sprite, -width / 2, -height / 2, width, height);
  ctx.restore();
  return true;
}

function animationReady(name) {
  const sheet = animationSheets[name];
  return Boolean(sheet && sheet.complete && sheet.naturalWidth > 0);
}

function getAnimationFrameCount(name) {
  const sheet = animationSheets[name];
  const def = animationDefs[name];
  if (!sheet || !def || !sheet.naturalWidth) {
    return 0;
  }
  return Math.max(1, Math.floor(sheet.naturalWidth / def.frameWidth));
}

function setAnimation(entity, animName) {
  if (entity.animName !== animName) {
    entity.animName = animName;
    entity.animTime = 0;
  }
}

function drawAnimation(name, x, y, width, height, elapsed, options = {}) {
  if (!animationReady(name)) {
    return false;
  }

  const sheet = animationSheets[name];
  const def = animationDefs[name];
  const frameCount = getAnimationFrameCount(name);
  let frameIndex = Math.floor(elapsed * def.fps);
  if (def.loop) {
    frameIndex %= frameCount;
  } else {
    frameIndex = Math.min(frameCount - 1, frameIndex);
  }
  if (typeof options.frameOverride === "number") {
    frameIndex = clamp(options.frameOverride, 0, frameCount - 1);
  }

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2);
  ctx.scale(options.flipX ? -1 : 1, 1);
  if (options.rotation) {
    ctx.rotate(options.rotation);
  }
  ctx.globalAlpha = options.alpha ?? 1;
  ctx.drawImage(
    sheet,
    frameIndex * def.frameWidth,
    0,
    def.frameWidth,
    def.frameHeight,
    -width / 2,
    -height / 2,
    width,
    height,
  );
  ctx.restore();
  return true;
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getEnemyBodyPoint(enemy) {
  return {
    x: enemy.x + enemy.facing * 22,
    y: enemy.y + 6,
  };
}

function reviveCostForType(type) {
  return Math.ceil(defenderTypes[type].cost * 0.25);
}

function getFallenDefenders() {
  return game.defenders.filter((defender) => defender.fallen);
}

function getMassReviveCost() {
  return getFallenDefenders().reduce((total, defender) => total + reviveCostForType(defender.type), 0);
}

function projectileHitsEnemy(projectile, enemy) {
  if (enemy.dead) {
    return false;
  }

  const body = getEnemyBodyPoint(enemy);
  return dist(projectile, body) < projectile.radius + 24;
}

function explodeProjectile(projectile) {
  if (!projectile.explosionRadius) {
    return;
  }

  addEffect("ring", projectile.x, projectile.y, projectile.color, 0.34, {
    radius: projectile.explosionRadius * 0.55,
  });
  addEffect("burst", projectile.x, projectile.y, "#dffcff", 0.24, {
    radius: projectile.explosionRadius * 0.32,
  });

  for (const enemy of game.enemies) {
    if (!enemy.dead && dist(getEnemyBodyPoint(enemy), projectile) < projectile.explosionRadius) {
      damageEnemy(enemy, projectile.explosionDamage ?? projectile.damage * 0.6, { silent: true });
    }
  }
}

function surfaceAt(x, y, tolerance = 18) {
  let bestSurface = null;
  let bestScore = Infinity;

  for (const surface of surfaces) {
    const withinX = x >= surface.x + 18 && x <= surface.x + surface.width - 18;
    const closeY = y <= surface.y + 20 && y >= surface.y - 150 - tolerance;
    if (!withinX || !closeY) {
      continue;
    }

    const score = Math.abs(surface.y - y);
    if (score < bestScore) {
      bestScore = score;
      bestSurface = surface;
    }
  }

  return bestSurface;
}

function validPlacement(x, y) {
  const surface = surfaceAt(x, y);
  if (!surface) {
    return null;
  }

  const placeY = surface.y - 38;
  const occupied = game.defenders.some(
    (defender) => !defender.fallen && Math.abs(defender.x - x) < 34 && Math.abs(defender.y - placeY) < 10,
  );

  if (occupied || Math.abs(game.core.x - x) < 68 && Math.abs(game.core.y - placeY) < 56) {
    return null;
  }

  return { x, y: placeY };
}

function placeDefender(x, y) {
  if (game.gameOver) {
    return;
  }

  if (!isPrepPhase()) {
    showMessage("You can only summon defenders during the preparation phase.");
    return;
  }

  const placement = validPlacement(x, y);
  const config = defenderTypes[game.selectedType];
  if (!placement) {
    showMessage("Defenders need stable footing on the ground or a platform.");
    return;
  }

  if (game.essence < config.cost) {
    showMessage(`Not enough essence for a ${config.label.toLowerCase()}.`);
    return;
  }

  game.essence -= config.cost;
  game.defenders.push(createDefender(game.selectedType, placement.x, placement.y));
  addEffect("ring", placement.x, placement.y + 20, config.color, 0.45, { radius: 18 });
  showMessage(`${config.label} deployed to the line.`);
}

function reviveDefender(defender, healthRatio = 0.55) {
  defender.fallen = false;
  defender.fallenTimer = 0;
  defender.hp = Math.max(1, Math.round(defender.maxHp * healthRatio));
  defender.cooldown = 0.35;
  defender.facing = 1;
  addEffect("burst", defender.x, defender.y + 10, "#92ffd3", 0.55, { radius: 22 });
}

function faceHeroToward(targetX) {
  const heroMid = game.hero.x + game.hero.width / 2;
  game.hero.facing = targetX >= heroMid ? 1 : -1;
}

function damageHero(amount) {
  const hero = game.hero;
  if (hero.invuln > 0 || hero.hp <= 0) {
    return;
  }
  hero.hp -= amount;
  hero.invuln = 0.65;
  hero.hitAnimTimer = 0.42;
  addEffect("spark", hero.x + hero.width / 2, hero.y + 18, "#ff9e7c", 0.28, { radius: 18 });
}

function beginEnemyDeath(enemy) {
  if (enemy.dead) {
    return;
  }
  enemy.dead = true;
  enemy.hp = 0;
  enemy.vx = 0;
  enemy.vy = 0;
  enemy.deathTimer = Math.max(0.8, getAnimationFrameCount("enemy_defeat") / animationDefs.enemy_defeat.fps);
  enemy.hitAnimTimer = 0;
  enemy.attackAnimTimer = 0;
  setAnimation(enemy, "defeat");
  addEffect("burst", enemy.x, enemy.y, "#79ff9d", 0.36, { radius: 20 });
}

function damageEnemy(enemy, amount, options = {}) {
  if (!enemy || enemy.dead) {
    return;
  }

  enemy.hp -= amount;
  if (!options.silent) {
    enemy.hitAnimTimer = Math.max(enemy.hitAnimTimer, 0.26);
  }

  if (enemy.hp <= 0) {
    beginEnemyDeath(enemy);
  }
}

function tryRevive() {
  const hero = game.hero;
  if (hero.reviveCooldown > 0 || game.gameOver) {
    return;
  }

  const nearby = game.defenders.find((defender) => {
    if (!defender.fallen) {
      return false;
    }
    const cost = reviveCostForType(defender.type);
    return dist(
      { x: defender.x, y: defender.y },
      { x: hero.x + hero.width / 2, y: hero.y + hero.height / 2 },
    ) < 70 && game.essence >= cost;
  });

  if (!nearby) {
    showMessage("Move closer to a fallen defender and keep enough essence to raise them.");
    return;
  }

  const cost = reviveCostForType(nearby.type);
  game.essence -= cost;
  reviveDefender(nearby, 0.55);
  hero.reviveCooldown = 1.4;
  showMessage(`${defenderTypes[nearby.type].label} restored to the fight.`);
}

function tryReviveAll() {
  if (!isPrepPhase() || game.gameOver) {
    return;
  }

  const fallenDefenders = getFallenDefenders();
  if (fallenDefenders.length === 0) {
    showMessage("No fallen defenders to revive.");
    return;
  }

  const totalCost = getMassReviveCost();
  if (game.essence < totalCost) {
    showMessage(`You need ${totalCost} essence to revive the full line.`);
    return;
  }

  game.essence -= totalCost;
  for (const defender of fallenDefenders) {
    reviveDefender(defender, 0.55);
  }
  showMessage(`The fallen line rises again for ${totalCost} essence.`);
}

function updateHero(dt) {
  const hero = game.hero;
  const wasOnGround = hero.onGround;
  const moveInput = (game.keys.KeyD ? 1 : 0) - (game.keys.KeyA ? 1 : 0);
  const running = Boolean(game.keys.ShiftLeft || game.keys.ShiftRight);
  const moveSpeed = running ? hero.runSpeed : hero.walkSpeed;
  hero.vx = moveInput * moveSpeed;
  if (moveInput !== 0) {
    hero.facing = moveInput > 0 ? 1 : -1;
  }

  let gravityForce = GRAVITY;
  if (!hero.onGround) {
    if (hero.jumpBoostTimer > 0) {
      gravityForce *= 0.68;
      hero.jumpBoostTimer = Math.max(0, hero.jumpBoostTimer - dt);
    } else if (hero.vy < -5) {
      gravityForce *= 0.7;
    } else if (hero.vy < -1.2) {
      gravityForce *= 0.48;
    } else if (hero.vy < 1.4 && hero.jumpHangTimer > 0) {
      gravityForce *= 0.08;
      hero.jumpHangTimer = Math.max(0, hero.jumpHangTimer - dt);
    } else if (hero.vy >= 0) {
      gravityForce *= 1.8;
    }
  }

  hero.vy += gravityForce;
  hero.x += hero.vx;
  hero.y += hero.vy;
  hero.onGround = false;

  hero.x = clamp(hero.x, 20, WIDTH - hero.width - 20);

  for (const surface of surfaces) {
    const onTop =
      hero.x + hero.width > surface.x &&
      hero.x < surface.x + surface.width &&
      hero.y + hero.height >= surface.y &&
      hero.y + hero.height - hero.vy <= surface.y &&
      hero.vy >= 0;
    if (onTop) {
      hero.y = surface.y - hero.height;
      hero.vy = 0;
      hero.onGround = true;
      hero.jumpBoostTimer = 0;
      hero.jumpHangTimer = 0;
      if (!wasOnGround) {
        hero.landingAnimTimer = hero.landingAnimDuration;
      }
    }
  }

  hero.strikeCooldown = Math.max(0, hero.strikeCooldown - dt);
  hero.spellCooldown = Math.max(0, hero.spellCooldown - dt);
  hero.reviveCooldown = Math.max(0, hero.reviveCooldown - dt);
  hero.invuln = Math.max(0, hero.invuln - dt);
  hero.meleeAnimTimer = Math.max(0, hero.meleeAnimTimer - dt);
  hero.magicAnimTimer = Math.max(0, hero.magicAnimTimer - dt);
  hero.hitAnimTimer = Math.max(0, hero.hitAnimTimer - dt);
  hero.landingAnimTimer = Math.max(0, hero.landingAnimTimer - dt);
  hero.mana = clamp(hero.mana + 8 * dt, 0, hero.maxMana);
  hero.hp = clamp(hero.hp + 1.8 * dt, 0, hero.maxHp);

  if (!hero.onGround) {
    hero.jumpAnimElapsed += dt;
  } else if (!wasOnGround) {
    hero.jumpAnimElapsed = 0;
  }

  let animName = "idle";
  if (hero.hp <= 0) {
    animName = "defeat";
  } else if (hero.hitAnimTimer > 0) {
    animName = "hit";
  } else if (hero.magicAnimTimer > 0) {
    animName = "magic";
  } else if (hero.meleeAnimTimer > 0) {
    animName = "melee";
  } else if (!hero.onGround || hero.landingAnimTimer > 0) {
    animName = "jump";
  } else if (Math.abs(hero.vx) > hero.walkSpeed + 0.2) {
    animName = "run";
  } else if (Math.abs(hero.vx) > 0.2) {
    animName = "walk";
  }

  setAnimation(hero, animName);
  hero.animTime += dt;
}

function placementsMatch(a, b) {
  return Boolean(a && b && Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1);
}

function updateSummon(dt) {
  const summon = game.summon;

  if (!isPrepPhase()) {
    summon.charge = 0;
    summon.placement = null;
    return;
  }

  const placement = validPlacement(game.mouse.x, game.mouse.y);
  const holding = Boolean(game.keys.KeyF || game.keys.f || game.keys.F) && !summon.lockedUntilRelease;

  if (!holding || !placement) {
    summon.charge = 0;
    summon.placement = placement;
    return;
  }

  if (!placementsMatch(summon.placement, placement)) {
    summon.charge = 0;
  }

  summon.placement = placement;
  summon.charge = summon.holdDuration;
  placeDefender(placement.x, placement.y);
  summon.charge = 0;
  summon.placement = null;
  summon.lockedUntilRelease = true;
}

function updateReviveAll(dt) {
  const hold = game.reviveAll;
  const canCharge = isPrepPhase() && getFallenDefenders().length > 0 && Boolean(game.keys.KeyR || game.keys.r || game.keys.R);

  if (!canCharge) {
    if (!(game.keys.KeyR || game.keys.r || game.keys.R)) {
      hold.charge = 0;
      hold.triggered = false;
    }
    return;
  }

  if (hold.triggered) {
    return;
  }

  hold.charge += dt;
  if (hold.charge >= hold.holdDuration) {
    tryReviveAll();
    hold.charge = hold.holdDuration;
    hold.triggered = true;
  }
}

function performHeroStrike() {
  const hero = game.hero;
  if (hero.strikeCooldown > 0 || game.gameOver) {
    return;
  }
  hero.strikeCooldown = 0.42;
  hero.meleeAnimTimer = 0.45;
  const origin = heroCenter();
  addEffect("slash", origin.x + hero.facing * 24, origin.y - 6, "#ffd08d", 0.24, { radius: 34 });

  for (const enemy of game.enemies) {
    const bodyPoint = getEnemyBodyPoint(enemy);
    const dx = bodyPoint.x - origin.x;
    const dy = bodyPoint.y - origin.y;
    if (!enemy.dead && Math.sign(dx || hero.facing) === hero.facing && Math.hypot(dx, dy) < 92) {
      damageEnemy(enemy, 22);
      enemy.vx += hero.facing * 0.6;
      addEffect("spark", enemy.x, enemy.y, "#ffd08d", 0.25, { radius: 12 });
    }
  }
}

function castHeroBolt() {
  const hero = game.hero;
  if (hero.spellCooldown > 0 || hero.mana < 18 || game.gameOver) {
    return;
  }

  hero.spellCooldown = 0.55;
  hero.magicAnimTimer = 0.5;
  hero.mana -= 18;
  const origin = heroCenter();
  game.projectiles.push({
    owner: "hero",
    kind: "bolt",
    x: origin.x + hero.facing * 18,
    y: origin.y - 10,
    vx: hero.facing * 11,
    vy: 0,
    radius: 9,
    damage: 24,
    explosionRadius: 88,
    explosionDamage: 22,
    color: "#8af7ff",
    life: 0.65,
  });
  addEffect("ring", origin.x + hero.facing * 10, origin.y - 12, "#8af7ff", 0.22, { radius: 12 });
}

function updateDefenders(dt) {
  for (const defender of game.defenders) {
    if (defender.fallen) {
      defender.fallenTimer += dt;
      continue;
    }

    const config = defenderTypes[defender.type];
    defender.animTime += dt;

    if (defender.attacking) {
      defender.attackAnimElapsed += dt;

      if (defender.type === "warrior" && !defender.attackResolved && defender.attackAnimElapsed >= 0.24) {
        if (
          defender.attackTarget &&
          !defender.attackTarget.dead &&
          dist({ x: defender.x, y: defender.y }, getEnemyBodyPoint(defender.attackTarget)) < config.range + 18
        ) {
          damageEnemy(defender.attackTarget, config.damage, { silent: true });
          defender.attackTarget.vx -= 0.25;
          addEffect("slash", defender.attackTarget.x, defender.attackTarget.y, config.color, 0.2, { radius: 18 });
        }
        defender.cooldown = config.cooldown;
        defender.attackResolved = true;
      }

      if (defender.type === "archer" && !defender.attackResolved && defender.attackAnimElapsed >= 0.5) {
        const targetPoint =
          defender.attackTarget && !defender.attackTarget.dead
            ? getEnemyBodyPoint(defender.attackTarget)
            : defender.attackTargetPoint;
        if (targetPoint) {
          game.projectiles.push({
            owner: "defender",
            subtype: "archer",
            x: defender.x,
            y: defender.y + 8,
            vx: (targetPoint.x - defender.x) / 18,
            vy: (targetPoint.y - defender.y) / 18,
            radius: 4,
            damage: config.damage,
            color: config.color,
            life: 1.4,
          });
        }
        defender.cooldown = config.cooldown;
        defender.attackResolved = true;
      }

      if (defender.type === "mage" && !defender.attackResolved && defender.attackAnimElapsed >= 1.15) {
        const targetPoint =
          defender.attackTarget && !defender.attackTarget.dead
            ? getEnemyBodyPoint(defender.attackTarget)
            : defender.attackTargetPoint;
        if (targetPoint) {
          game.projectiles.push({
            owner: "defender",
            subtype: "mage",
            x: defender.x,
            y: defender.y + 10,
            vx: (targetPoint.x - defender.x) / 22,
            vy: (targetPoint.y - defender.y) / 22,
            radius: 6,
            damage: config.damage,
            splash: config.splash,
            color: "#6dff9d",
            life: 1.6,
          });
        }
        defender.cooldown = config.cooldown;
        defender.attackResolved = true;
      }

      const attackDuration =
        defender.type === "archer" ? 0.7 : defender.type === "mage" ? 1.5 : 0.55;
      if (defender.attackAnimElapsed >= attackDuration) {
        defender.attacking = false;
        defender.attackAnimElapsed = 0;
        defender.attackResolved = false;
        defender.attackTarget = null;
        defender.attackTargetPoint = null;
        defender.animTime = 0;
      }
      continue;
    }

    defender.cooldown -= dt;
    const defenderPos = { x: defender.x, y: defender.y };
    const target = game.enemies.find(
      (enemy) => !enemy.dead && dist(defenderPos, getEnemyBodyPoint(enemy)) < config.range,
    );

    if (!target || defender.cooldown > 0) {
      continue;
    }

    defender.facing = getEnemyBodyPoint(target).x >= defender.x ? 1 : -1;

    if (defender.type === "warrior" || defender.type === "archer" || defender.type === "mage") {
      defender.attacking = true;
      defender.attackAnimElapsed = 0;
      defender.attackResolved = false;
      defender.attackTarget = target;
      defender.attackTargetPoint = getEnemyBodyPoint(target);
      defender.animTime = 0;
    }
  }
}

function nearestLivingDefender(enemy) {
  let chosen = null;
  let bestDistance = Infinity;
  for (const defender of game.defenders) {
    if (defender.fallen) {
      continue;
    }
    const d = dist(enemy, defender);
    if (d < bestDistance) {
      bestDistance = d;
      chosen = defender;
    }
  }
  return chosen && bestDistance < 200 ? chosen : null;
}

function updateEnemies(dt) {
  for (const enemy of game.enemies) {
    enemy.animTime += dt;

    if (enemy.dead) {
      enemy.deathTimer = Math.max(0, enemy.deathTimer - dt);
      continue;
    }

    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
    enemy.attackAnimTimer = Math.max(0, enemy.attackAnimTimer - dt);
    enemy.hitAnimTimer = Math.max(0, enemy.hitAnimTimer - dt);
    enemy.bobOffset += dt * 2.2;
    const bob = Math.sin(enemy.bobOffset) * 0.35;

    const defenderTarget = nearestLivingDefender(enemy);
    const heroPos = heroCenter();
    const coreTarget = { x: game.core.x, y: game.core.y };
    let target = coreTarget;

    if (defenderTarget && (enemy.targetMode === "defender" || dist(enemy, defenderTarget) < 100)) {
      target = defenderTarget;
    } else if (dist(enemy, heroPos) < 120) {
      target = heroPos;
    }

    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const distance = Math.hypot(dx, dy) || 1;
    if (Math.abs(dx) > 3) {
      enemy.facing = dx > 0 ? 1 : -1;
    }
    const speed = enemy.kind === "harrier" ? 1.65 : 1.45;
    enemy.x += (dx / distance) * speed + enemy.vx * dt * 60;
    enemy.y += (dy / distance) * speed * 0.72 + bob;
    enemy.vx *= 0.97;

    if (distance < 34 && enemy.attackCooldown <= 0) {
      enemy.attackCooldown = 0.92;
      enemy.attackAnimTimer = 0.52;
      if (target === coreTarget) {
        game.core.hp -= enemy.damage;
        addEffect("spark", game.core.x + 12, game.core.y - 4, "#a3ffb5", 0.28, { radius: 20 });
      } else if (target === heroPos) {
        damageHero(enemy.damage);
      } else if (!target.fallen) {
        target.hp -= enemy.damage;
        addEffect("spark", target.x, target.y + 12, "#9affbe", 0.28, { radius: 16 });
      }
    }

    let animName = "fly";
    if (enemy.hitAnimTimer > 0) {
      animName = "hit";
    } else if (enemy.attackAnimTimer > 0) {
      animName = "attack";
    } else if (distance < 72) {
      animName = "idle";
    }
    setAnimation(enemy, animName);
  }

  for (const defender of game.defenders) {
    if (!defender.fallen && defender.hp <= 0) {
      defender.fallen = true;
      defender.fallenTimer = 0;
      addEffect("burst", defender.x, defender.y + 8, "#ffffff", 0.38, { radius: 18 });
      showMessage(`${defenderTypes[defender.type].label} has fallen. Move in and revive them.`);
    }
  }

  game.enemies = game.enemies.filter((enemy) => {
    if (!enemy.dead) {
      return true;
    }
    if (enemy.deathTimer > 0) {
      return true;
    }
    game.essence += 8;
    return false;
  });
}

function updateProjectiles(dt) {
  for (const projectile of game.projectiles) {
    projectile.life -= dt;
    projectile.x += projectile.vx * 60 * dt;
    projectile.y += projectile.vy * 60 * dt;

    if (projectile.life <= 0 && projectile.explosionRadius) {
      explodeProjectile(projectile);
      projectile.life = -1;
    }
  }

  for (const projectile of game.projectiles) {
    if (projectile.life <= 0) {
      continue;
    }

    const hit = game.enemies.find((enemy) => projectileHitsEnemy(projectile, enemy));
    if (!hit) {
      continue;
    }

    const hitPoint = getEnemyBodyPoint(hit);
    projectile.x = hitPoint.x;
    projectile.y = hitPoint.y;
    damageEnemy(hit, projectile.damage);
    addEffect("spark", projectile.x, projectile.y, projectile.color, 0.22, { radius: 12 });
    if (projectile.explosionRadius) {
      explodeProjectile(projectile);
    } else if (projectile.splash) {
      for (const enemy of game.enemies) {
        if (enemy !== hit && !enemy.dead && dist(getEnemyBodyPoint(enemy), projectile) < projectile.splash) {
          damageEnemy(enemy, projectile.damage * 0.55, { silent: true });
        }
      }
      addEffect("ring", projectile.x, projectile.y, projectile.color, 0.3, { radius: projectile.splash * 0.5 });
    }
    projectile.life = 0;
  }

  game.projectiles = game.projectiles.filter(
    (projectile) =>
      projectile.life > 0 &&
      projectile.x > -40 &&
      projectile.x < WIDTH + 40 &&
      projectile.y > -40 &&
      projectile.y < HEIGHT + 40,
  );
}

function updateEffects(dt) {
  for (const effect of game.effects) {
    effect.life -= dt;
  }
  game.effects = game.effects.filter((effect) => effect.life > 0);
}

function updateWave(dt) {
  if (isPrepPhase()) {
    game.prepTimer = Math.max(0, game.prepTimer - dt);
    if (game.prepTimer === 0) {
      showMessage(`Round ${game.wave} begins. Hold the rampart.`, 3.2);
    }
    return;
  }

  game.spawnAccumulator += dt;
  const spawnDelay = Math.max(0.38, 1.05 - game.wave * 0.07);

  if (game.waveSpawned < game.waveSpawnTarget && game.spawnAccumulator >= spawnDelay) {
    game.enemies.push(createEnemy(game.wave));
    game.waveSpawned += 1;
    game.spawnAccumulator = 0;
  }

  if (game.waveSpawned >= game.waveSpawnTarget && game.enemies.length === 0) {
    if (game.wave >= game.totalWaves) {
      game.gameOver = true;
      game.victory = true;
      game.running = false;
      showMessage("The angelic host breaks and retreats. Skyhold endures.", 999);
      return;
    }

    game.wave += 1;
    game.waveSpawned = 0;
    game.waveSpawnTarget = 7 + game.wave * 2;
    game.prepTimer = game.prepDuration;
    game.essence += 28;
    game.hero.mana = clamp(game.hero.mana + 16, 0, game.hero.maxMana);
    for (const defender of game.defenders) {
      defender.facing = 1;
    }
    showMessage(`Round ${game.wave} preparation. Decide who returns to the line.`, 4.5);
  }
}

function updateState(dt) {
  if (game.gameOver) {
    game.time += dt;
    if (game.hero.hp <= 0) {
      game.hero.animTime += dt;
    }
    for (const enemy of game.enemies) {
      if (enemy.dead) {
        enemy.animTime += dt;
      }
    }
    updateEffects(dt);
    return;
  }

  game.dt = dt;
  game.time += dt;

  if (game.messageTimer > 0) {
    game.messageTimer -= dt;
    if (game.messageTimer <= 0) {
      ui.messageBox.textContent = "The sanctum still stands. Keep the lane reinforced.";
    }
  }

  updateHero(dt);
  updateDefenders(dt);
  updateEnemies(dt);
  updateProjectiles(dt);
  updateEffects(dt);
  updateSummon(dt);
  updateReviveAll(dt);
  updateWave(dt);

  if (game.hero.hp <= 0 || game.core.hp <= 0) {
    game.gameOver = true;
    game.running = false;
    showMessage("The skyhold has fallen. Refresh to defend it again.", 999);
  }

  updateUi();
}

function updateUi() {
  ui.coreHealth.textContent = `${Math.max(0, Math.ceil(game.core.hp))}`;
  ui.heroHealth.textContent = `${Math.max(0, Math.ceil(game.hero.hp))}`;
  ui.essence.textContent = `${Math.floor(game.essence)}`;
  ui.wave.textContent = `${game.wave}${isPrepPhase() ? " Prep" : ""}`;
  ui.mana.textContent = `Mana: ${Math.floor(game.hero.mana)}`;
  ui.enemies.textContent = `Enemies: ${game.enemies.length}`;
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, "#081320");
  sky.addColorStop(0.45, "#173754");
  sky.addColorStop(1, "#12171d");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (let i = 0; i < 24; i += 1) {
    const x = (i * 167 + Math.sin(game.time * 0.15 + i) * 40) % WIDTH;
    const y = 70 + (i * 31) % 220;
    ctx.fillStyle = "rgba(214, 239, 255, 0.06)";
    ctx.beginPath();
    ctx.arc(x, y, 1.3 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(8, 14, 24, 0.48)";
  ctx.beginPath();
  ctx.moveTo(0, HEIGHT - 170);
  ctx.lineTo(160, HEIGHT - 320);
  ctx.lineTo(330, HEIGHT - 230);
  ctx.lineTo(520, HEIGHT - 360);
  ctx.lineTo(770, HEIGHT - 220);
  ctx.lineTo(940, HEIGHT - 330);
  ctx.lineTo(1160, HEIGHT - 180);
  ctx.lineTo(WIDTH, HEIGHT - 210);
  ctx.lineTo(WIDTH, HEIGHT);
  ctx.lineTo(0, HEIGHT);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#1b2530";
  ctx.fillRect(0, FLOOR_Y, WIDTH, HEIGHT - FLOOR_Y);
}

function drawTerrain() {
  for (const surface of surfaces) {
    const gradient = ctx.createLinearGradient(0, surface.y, 0, surface.y + surface.height);
    gradient.addColorStop(0, "#537085");
    gradient.addColorStop(1, "#223645");
    ctx.fillStyle = gradient;
    ctx.fillRect(surface.x, surface.y, surface.width, surface.height);

    ctx.fillStyle = "rgba(191, 230, 255, 0.18)";
    ctx.fillRect(surface.x, surface.y, surface.width, 4);
  }

  ctx.fillStyle = "#314858";
  ctx.fillRect(game.core.x - 58, FLOOR_Y - 12, 116, 12);

  ctx.fillStyle = "rgba(255, 212, 132, 0.18)";
  ctx.fillRect(game.core.x - 44, FLOOR_Y - 18, 88, 6);

  const pulse = 1 + Math.sin(game.time * 3.2) * 0.04;
  const coreGradient = ctx.createRadialGradient(game.core.x, game.core.y, 8, game.core.x, game.core.y, 45);
  coreGradient.addColorStop(0, "#f2f0ff");
  coreGradient.addColorStop(0.45, "#9be1ff");
  coreGradient.addColorStop(1, "rgba(84, 164, 212, 0.2)");
  ctx.save();
  ctx.translate(game.core.x, game.core.y);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = coreGradient;
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.lineTo(23, 0);
  ctx.lineTo(0, 34);
  ctx.lineTo(-23, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "rgba(239, 248, 255, 0.75)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(game.core.x, game.core.y, 30 + Math.sin(game.time * 2.6) * 2, 0, Math.PI * 2);
  ctx.stroke();
}

function drawHero() {
  const hero = game.hero;
  const blink = hero.invuln > 0 && Math.floor(game.time * 20) % 2 === 0;
  if (blink) {
    return;
  }

  ctx.fillStyle = "rgba(6, 10, 16, 0.38)";
  ctx.beginPath();
  ctx.ellipse(hero.x + hero.width / 2, hero.y + hero.height + 4, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  const animKey = `hero_${hero.hp <= 0 ? "defeat" : hero.animName}`;
  const heroFeetY = hero.y + hero.height;
  const heroRenderWidth = 82;
  const heroRenderHeight = 82;
  let frameOverride;
  if (animKey === "hero_jump") {
    if (hero.onGround && hero.landingAnimTimer > 0) {
      const landingProgress = 1 - hero.landingAnimTimer / hero.landingAnimDuration;
      frameOverride = landingProgress < 0.5 ? 6 : 7;
    } else if (hero.jumpAnimElapsed < 0.08) {
      frameOverride = Math.min(3, Math.floor(hero.jumpAnimElapsed / 0.02));
    } else if (hero.vy < 0) {
      frameOverride = 4;
    } else {
      frameOverride = 5;
    }
  }
  if (
    drawAnimation(
      animKey,
      hero.x + hero.width / 2 - heroRenderWidth / 2,
      heroFeetY - heroRenderHeight,
      heroRenderWidth,
      heroRenderHeight,
      hero.animTime,
      { flipX: hero.facing < 0, frameOverride },
    )
  ) {
    return;
  }

  ctx.save();
  ctx.translate(hero.x, hero.y);

  ctx.fillStyle = "#19304e";
  ctx.fillRect(8, 8, 12, 22);
  ctx.fillStyle = "#5ba9ff";
  ctx.fillRect(6, 18, 16, 28);
  ctx.fillStyle = "#d6e8ff";
  ctx.beginPath();
  ctx.arc(14, 10, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f1c473";
  ctx.fillRect(hero.facing > 0 ? 23 : -8, 24, 11, 4);
  ctx.fillRect(6, 48, 5, 10);
  ctx.fillRect(17, 48, 5, 10);

  ctx.strokeStyle = "rgba(133, 237, 255, 0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(14 + hero.facing * 3, 30, 10, -0.7, 1.2);
  ctx.stroke();

  ctx.restore();
}

function drawDefender(defender) {
  const config = defenderTypes[defender.type];
  const usesAnimatedSheet =
    defender.type === "warrior" || defender.type === "archer" || defender.type === "mage";
  const spriteWidth = defender.type === "archer" ? 84 : defender.type === "mage" ? 84 : 82;
  const spriteHeight = defender.type === "archer" ? 84 : defender.type === "mage" ? 84 : 82;
  const defenderFeetY = defender.y + defender.height;
  const spriteX = defender.x - spriteWidth / 2;
  const spriteY = defenderFeetY - spriteHeight;

  ctx.fillStyle = "rgba(6, 10, 16, 0.32)";
  ctx.beginPath();
  ctx.ellipse(defender.x, defenderFeetY + 2, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (defender.fallen) {
    if (
      drawStaticSprite(
        defender.type,
        defender.x - spriteWidth / 2 + 10,
        defenderFeetY - spriteHeight + 8,
        spriteWidth,
        spriteHeight,
        {
          alpha: 0.58,
          rotation: Math.PI / 2.7,
          flipX: defender.facing < 0,
        },
      )
    ) {
      return;
    }
  } else if (usesAnimatedSheet) {
    const animKey = `${defender.type}_${defender.attacking ? "attack" : "idle"}`;
    let frameOverride;
    if (defender.type === "archer" && defender.attacking) {
      if (defender.attackAnimElapsed < 0.38) {
        frameOverride = Math.min(4, Math.floor(defender.attackAnimElapsed / (0.38 / 5)));
      } else if (defender.attackAnimElapsed < 0.5) {
        frameOverride = 5;
      } else {
        const releaseProgress = (defender.attackAnimElapsed - 0.5) / 0.2;
        frameOverride = releaseProgress < 0.5 ? 6 : 7;
      }
    } else if (defender.type === "mage" && defender.attacking) {
      if (defender.attackAnimElapsed < 0.76) {
        frameOverride = Math.min(3, Math.floor(defender.attackAnimElapsed / (0.76 / 4)));
      } else if (defender.attackAnimElapsed < 1.15) {
        frameOverride = 4;
      } else {
        const releaseProgress = (defender.attackAnimElapsed - 1.15) / 0.35;
        frameOverride = releaseProgress < 0.34 ? 5 : releaseProgress < 0.68 ? 6 : 7;
      }
    } else if (defender.type === "warrior" && defender.attacking) {
      frameOverride = clamp(Math.floor(defender.attackAnimElapsed / (0.55 / 8)), 0, 7);
    }

    if (
      drawAnimation(animKey, spriteX, spriteY, spriteWidth, spriteHeight, defender.animTime, {
        frameOverride,
        flipX: defender.facing < 0,
      })
    ) {
      ctx.fillStyle = "rgba(12, 22, 32, 0.7)";
      ctx.fillRect(defender.x - 16, defender.y - 20, 32, 4);
      ctx.fillStyle = "#7af4b0";
      ctx.fillRect(defender.x - 16, defender.y - 20, 32 * (defender.hp / defender.maxHp), 4);
      return;
    }
  } else if (drawStaticSprite(defender.type, spriteX, spriteY, spriteWidth, spriteHeight, { flipX: defender.facing < 0 })) {
    ctx.fillStyle = "rgba(12, 22, 32, 0.7)";
    ctx.fillRect(defender.x - 16, defender.y - 20, 32, 4);
    ctx.fillStyle = "#7af4b0";
    ctx.fillRect(defender.x - 16, defender.y - 20, 32 * (defender.hp / defender.maxHp), 4);
    return;
  }

  ctx.save();
  ctx.translate(defender.x, defender.y);

  if (defender.fallen) {
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "#64798a";
    ctx.fillRect(-16, 20, 32, 10);
    ctx.fillStyle = config.color;
    ctx.fillRect(-12, 16, 24, 8);
    ctx.restore();
    return;
  }

  ctx.fillStyle = config.color;
  if (defender.type === "warrior") {
    ctx.fillRect(-10, 6, 20, 30);
    ctx.fillStyle = "#ffe2b5";
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d8eefc";
    ctx.fillRect(10, 9, 5, 18);
  } else if (defender.type === "archer") {
    ctx.fillRect(-8, 8, 16, 28);
    ctx.fillStyle = "#ffe2b5";
    ctx.beginPath();
    ctx.arc(0, 2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#d7f4ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(7, 18, 10, -1.2, 1.2);
    ctx.stroke();
  } else {
    ctx.fillRect(-7, 12, 14, 24);
    ctx.fillStyle = "#ffe2b5";
    ctx.beginPath();
    ctx.arc(0, 4, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f0d2ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, 8);
    ctx.lineTo(14, -10);
    ctx.stroke();
    ctx.fillStyle = "#caa7ff";
    ctx.beginPath();
    ctx.arc(14, -12, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(12, 22, 32, 0.7)";
  ctx.fillRect(-16, -20, 32, 4);
  ctx.fillStyle = "#7af4b0";
  ctx.fillRect(-16, -20, 32 * (defender.hp / defender.maxHp), 4);
  ctx.restore();
}

function drawEnemy(enemy) {
  ctx.fillStyle = "rgba(6, 10, 16, 0.22)";
  ctx.beginPath();
  ctx.ellipse(enemy.x, enemy.y + 46, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const animKey = `enemy_${enemy.dead ? "defeat" : enemy.animName}`;
  if (drawAnimation(animKey, enemy.x - 72, enemy.y - 74, 148, 148, enemy.animTime, { flipX: enemy.facing > 0 })) {
    ctx.fillStyle = "rgba(12, 22, 18, 0.72)";
    ctx.fillRect(enemy.x - 18, enemy.y - 26, 36, 4);
    ctx.fillStyle = "#7bff9d";
    ctx.fillRect(enemy.x - 18, enemy.y - 26, 36 * Math.max(0, enemy.hp / enemy.maxHp), 4);
    return;
  }

  ctx.save();
  ctx.translate(enemy.x, enemy.y);

  ctx.fillStyle = "rgba(133, 255, 165, 0.2)";
  ctx.beginPath();
  ctx.ellipse(-16, -2, 18, 10, -0.65, 0, Math.PI * 2);
  ctx.ellipse(16, -2, 18, 10, 0.65, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(122, 255, 161, 0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, 3);
  ctx.quadraticCurveTo(-28, -18, -14, -30);
  ctx.moveTo(8, 3);
  ctx.quadraticCurveTo(28, -18, 14, -30);
  ctx.stroke();

  ctx.fillStyle = "#63d479";
  ctx.fillRect(-8, 3, 16, 24);
  ctx.fillStyle = "#dfffe0";
  ctx.beginPath();
  ctx.arc(0, -7, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7bf98e";
  ctx.fillRect(-4, 27, 3, 10);
  ctx.fillRect(1, 27, 3, 10);

  ctx.fillStyle = "rgba(12, 22, 18, 0.72)";
  ctx.fillRect(-18, -26, 36, 4);
  ctx.fillStyle = "#7bff9d";
  ctx.fillRect(-18, -26, 36 * (enemy.hp / enemy.maxHp), 4);
  ctx.restore();
}

function drawProjectiles() {
  for (const projectile of game.projectiles) {
    ctx.fillStyle = projectile.color;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `${projectile.color}55`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius + 4, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawEffects() {
  for (const effect of game.effects) {
    const alpha = effect.life / effect.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = effect.color;
    ctx.fillStyle = effect.color;

    if (effect.type === "ring" || effect.type === "burst") {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius * (1 + (1 - alpha)), 0, Math.PI * 2);
      ctx.stroke();
    } else if (effect.type === "slash") {
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius, -0.7, 1.6);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawPlacementPreview() {
  if (!isPrepPhase()) {
    return;
  }

  const placement = validPlacement(game.mouse.x, game.mouse.y);
  if (!placement || game.gameOver) {
    return;
  }

  const config = defenderTypes[game.selectedType];
  ctx.save();
  ctx.globalAlpha = 0.4;
  const previewFeetY = placement.y + 38;
  if (
    !drawStaticSprite(game.selectedType, placement.x - 38, previewFeetY - 76, 76, 76, {
      alpha: 0.4,
    })
  ) {
    ctx.fillStyle = config.color;
    ctx.fillRect(placement.x - 12, placement.y, 24, 38);
  }

  const summon = game.summon;
  const progress =
    summon.placement && placementsMatch(summon.placement, placement)
      ? clamp(summon.charge / summon.holdDuration, 0, 1)
      : 0;

  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(230, 244, 255, 0.45)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(placement.x, placement.y - 18, 16, 0, Math.PI * 2);
  ctx.stroke();

  if (progress > 0) {
    ctx.strokeStyle = "#f7c96a";
    ctx.beginPath();
    ctx.arc(placement.x, placement.y - 18, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();
  }

  ctx.restore();
}

function drawOverlay() {
  ctx.fillStyle = "rgba(10, 16, 24, 0.62)";
  ctx.fillRect(18, 16, 390, 108);
  ctx.fillStyle = "#edf5ff";
  ctx.font = '20px "Palatino Linotype", Georgia, serif';
  ctx.fillText(`Round ${game.wave}`, 34, 44);
  ctx.font = '14px "Avenir Next", "Segoe UI", sans-serif';
  ctx.fillStyle = "#9fc7de";
  if (isPrepPhase()) {
    ctx.fillText(`Preparation: ${Math.ceil(game.prepTimer)}s to summon defenders`, 34, 68);
    ctx.fillText(`Press F over a platform to deploy instantly`, 34, 90);
    ctx.fillText(`Tap R for one revive, hold R for the whole line`, 34, 112);
  } else {
    ctx.fillText(`Survive until round ${game.totalWaves} and keep the core alive`, 34, 68);
    ctx.fillText(`Mouse 1 strikes, Mouse 2 casts, R revives`, 34, 90);
    ctx.fillText(`Next defender summons open between rounds`, 34, 112);
  }

  if (game.gameOver) {
    ctx.fillStyle = "rgba(8, 12, 18, 0.72)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#f4fbff";
    ctx.textAlign = "center";
    ctx.font = '44px "Palatino Linotype", Georgia, serif';
    ctx.fillText(game.victory ? "Skyhold Stands" : "Skyhold Falls", WIDTH / 2, HEIGHT / 2 - 18);
    ctx.font = '18px "Avenir Next", "Segoe UI", sans-serif';
    ctx.fillStyle = "#bdd4e4";
    ctx.fillText("Refresh the page to begin another defense.", WIDTH / 2, HEIGHT / 2 + 20);
    ctx.textAlign = "left";
  }
}

function drawPrepCountdown() {
  if (!isPrepPhase() || game.gameOver) {
    return;
  }

  const secondsLeft = Math.ceil(game.prepTimer);
  const urgent = secondsLeft <= 5;
  const critical = secondsLeft <= 3;
  const pulse = 1 + Math.sin(game.time * (critical ? 12 : urgent ? 8 : 4)) * (critical ? 0.08 : 0.04);
  const bannerWidth = critical ? 340 : 290;
  const bannerHeight = critical ? 126 : 102;
  const x = WIDTH / 2 - bannerWidth / 2;
  const y = 22;

  ctx.save();
  ctx.translate(WIDTH / 2, y + bannerHeight / 2);
  ctx.scale(pulse, pulse);
  ctx.translate(-WIDTH / 2, -(y + bannerHeight / 2));

  const panel = ctx.createLinearGradient(0, y, 0, y + bannerHeight);
  if (critical) {
    panel.addColorStop(0, "rgba(88, 18, 18, 0.95)");
    panel.addColorStop(1, "rgba(18, 5, 8, 0.92)");
  } else if (urgent) {
    panel.addColorStop(0, "rgba(89, 46, 14, 0.94)");
    panel.addColorStop(1, "rgba(22, 9, 6, 0.92)");
  } else {
    panel.addColorStop(0, "rgba(16, 29, 46, 0.94)");
    panel.addColorStop(1, "rgba(7, 12, 20, 0.92)");
  }

  const glowAlpha = critical ? 0.32 : urgent ? 0.18 : 0.1;
  ctx.fillStyle = critical ? `rgba(255, 96, 96, ${glowAlpha})` : urgent ? `rgba(255, 176, 92, ${glowAlpha})` : `rgba(111, 201, 255, ${glowAlpha})`;
  ctx.fillRect(x - 10, y - 8, bannerWidth + 20, bannerHeight + 16);

  ctx.fillStyle = panel;
  ctx.fillRect(x, y, bannerWidth, bannerHeight);

  ctx.strokeStyle = critical ? "rgba(255, 148, 148, 0.95)" : urgent ? "rgba(255, 205, 128, 0.92)" : "rgba(163, 216, 255, 0.82)";
  ctx.lineWidth = critical ? 4 : 3;
  ctx.strokeRect(x, y, bannerWidth, bannerHeight);

  ctx.textAlign = "center";
  ctx.fillStyle = critical ? "#ffe6e6" : "#edf5ff";
  ctx.font = '16px "Avenir Next", "Segoe UI", sans-serif';
  ctx.fillText(critical ? "BATTLE SURGES IN" : "PREPARE THE RAMPART", WIDTH / 2, y + 28);

  ctx.font = critical ? '58px "Palatino Linotype", Georgia, serif' : '50px "Palatino Linotype", Georgia, serif';
  ctx.fillStyle = critical ? "#fff2d7" : urgent ? "#ffe6bf" : "#f8fbff";
  ctx.fillText(`${secondsLeft}`, WIDTH / 2, y + 82);

  const fallenDefenders = getFallenDefenders();
  const totalReviveCost = getMassReviveCost();
  const reviveProgress = clamp(game.reviveAll.charge / game.reviveAll.holdDuration, 0, 1);
  const calloutY = y + bannerHeight + 22;

  if (!critical) {
    const calloutWidth = fallenDefenders.length > 0 ? 520 : 460;
    const calloutHeight = 54;
    const calloutX = WIDTH / 2 - calloutWidth / 2;

    ctx.fillStyle = "rgba(6, 12, 20, 0.76)";
    ctx.fillRect(calloutX, calloutY, calloutWidth, calloutHeight);
    ctx.strokeStyle = fallenDefenders.length > 0 ? "rgba(146, 255, 211, 0.55)" : "rgba(189, 212, 228, 0.4)";
    ctx.lineWidth = 2;
    ctx.strokeRect(calloutX, calloutY, calloutWidth, calloutHeight);

    ctx.font = '18px "Avenir Next", "Segoe UI", sans-serif';
    ctx.fillStyle = "#e7f3ff";
    if (fallenDefenders.length > 0) {
      const reviveText = `Hold R 1s to revive all for ${totalReviveCost} essence`;
      ctx.fillText(reviveText, WIDTH / 2, calloutY + 24);

      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.fillRect(WIDTH / 2 - 104, calloutY + 34, 208, 8);
      ctx.fillStyle = game.essence >= totalReviveCost ? "#92ffd3" : "#ff9d86";
      ctx.fillRect(WIDTH / 2 - 104, calloutY + 34, 208 * reviveProgress, 8);
    } else {
      ctx.fillText("Tap R near a fallen defender to revive one", WIDTH / 2, calloutY + 32);
    }
  }

  ctx.textAlign = "left";
  ctx.restore();
}

function render() {
  drawBackground();
  drawTerrain();
  drawPlacementPreview();
  for (const defender of game.defenders) {
    drawDefender(defender);
  }
  drawHero();
  for (const enemy of game.enemies) {
    drawEnemy(enemy);
  }
  drawProjectiles();
  drawEffects();
  drawOverlay();
  drawPrepCountdown();
}

function frame(timestamp) {
  if (!game.lastTime) {
    game.lastTime = timestamp;
  }
  const dt = Math.min((timestamp - game.lastTime) / 1000, 0.033);
  game.lastTime = timestamp;

  updateState(dt);
  render();
  requestAnimationFrame(frame);
}

function onJump() {
  if (game.hero.onGround && !game.gameOver) {
    game.hero.vy = -game.hero.jumpStrength;
    game.hero.jumpBoostTimer = game.hero.jumpBoostDuration;
    game.hero.jumpHangTimer = game.hero.jumpHangDuration;
    game.hero.jumpAnimElapsed = 0;
    game.hero.landingAnimTimer = 0;
    game.hero.onGround = false;
  }
}

document.addEventListener("keydown", (event) => {
  game.keys[event.code] = true;
  game.keys[event.key] = true;

  if (event.code === "Space" || event.code === "KeyW") {
    event.preventDefault();
    onJump();
  }

  if (event.code === "Digit1") {
    setSelectedType("warrior");
  }
  if (event.code === "Digit2") {
    setSelectedType("archer");
  }
  if (event.code === "Digit3") {
    setSelectedType("mage");
  }
});

document.addEventListener("keyup", (event) => {
  game.keys[event.code] = false;
  game.keys[event.key] = false;
  if (event.code === "KeyF") {
    game.summon.charge = 0;
    game.summon.placement = null;
    game.summon.lockedUntilRelease = false;
  }
  if (event.key === "f" || event.key === "F") {
    game.summon.charge = 0;
    game.summon.placement = null;
    game.summon.lockedUntilRelease = false;
  }
  if (event.code === "KeyR" || event.key === "r" || event.key === "R") {
    const didHoldLongEnough = game.reviveAll.charge >= game.reviveAll.holdDuration;
    const wasTriggered = game.reviveAll.triggered;
    game.reviveAll.charge = 0;
    game.reviveAll.triggered = false;
    if (!didHoldLongEnough && !wasTriggered) {
      tryRevive();
    }
  }
});

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = WIDTH / rect.width;
  const scaleY = HEIGHT / rect.height;
  game.mouse.x = (event.clientX - rect.left) * scaleX;
  game.mouse.y = (event.clientY - rect.top) * scaleY;
});

canvas.addEventListener("mousedown", (event) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = WIDTH / rect.width;
  const scaleY = HEIGHT / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;
  game.mouse.x = x;
  game.mouse.y = y;

  if (event.button === 0) {
    performHeroStrike();
  } else if (event.button === 2) {
    event.preventDefault();
    castHeroBolt();
  }
});

canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

for (const button of ui.buttons) {
  button.addEventListener("click", () => setSelectedType(button.dataset.type));
}

game.hero = createHero();
setSelectedType("warrior");
updateUi();
requestAnimationFrame(frame);
