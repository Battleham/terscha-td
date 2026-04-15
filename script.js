const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

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

const defenderTypes = {
  warrior: {
    label: "Warrior",
    cost: 25,
    reviveCost: 16,
    hp: 125,
    range: 74,
    damage: 17,
    cooldown: 0.85,
    color: "#f6b56b",
  },
  archer: {
    label: "Archer",
    cost: 35,
    reviveCost: 20,
    hp: 80,
    range: 220,
    damage: 11,
    cooldown: 1.15,
    color: "#8fd8ff",
  },
  mage: {
    label: "Mage",
    cost: 45,
    reviveCost: 26,
    hp: 68,
    range: 198,
    damage: 15,
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
    moveSpeed: 4.3,
    jumpStrength: 11.8,
    onGround: false,
    hp: 170,
    maxHp: 170,
    mana: 90,
    maxMana: 90,
    strikeCooldown: 0,
    spellCooldown: 0,
    reviveCooldown: 0,
    invuln: 0,
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

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
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

function faceHeroToward(targetX) {
  const heroMid = game.hero.x + game.hero.width / 2;
  game.hero.facing = targetX >= heroMid ? 1 : -1;
}

function tryRevive() {
  const hero = game.hero;
  if (hero.reviveCooldown > 0 || hero.mana < 12 || game.gameOver) {
    return;
  }

  const nearby = game.defenders.find((defender) => {
    if (!defender.fallen) {
      return false;
    }
    const cost = defenderTypes[defender.type].reviveCost;
    return dist(
      { x: defender.x, y: defender.y },
      { x: hero.x + hero.width / 2, y: hero.y + hero.height / 2 },
    ) < 70 && hero.mana >= cost;
  });

  if (!nearby) {
    showMessage("Move closer to a fallen defender and gather enough mana to revive them.");
    return;
  }

  const cost = defenderTypes[nearby.type].reviveCost;
  hero.mana -= cost;
  nearby.fallen = false;
  nearby.hp = Math.round(nearby.maxHp * 0.55);
  nearby.cooldown = 0.5;
  hero.reviveCooldown = 1.4;
  addEffect("burst", nearby.x, nearby.y + 10, "#92ffd3", 0.6, { radius: 26 });
  showMessage(`${defenderTypes[nearby.type].label} restored to the fight.`);
}

function updateHero(dt) {
  const hero = game.hero;
  const moveInput = (game.keys.KeyD ? 1 : 0) - (game.keys.KeyA ? 1 : 0);
  hero.vx = moveInput * hero.moveSpeed;
  if (moveInput !== 0) {
    hero.facing = moveInput > 0 ? 1 : -1;
  }

  hero.vy += GRAVITY;
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
    }
  }

  hero.strikeCooldown = Math.max(0, hero.strikeCooldown - dt);
  hero.spellCooldown = Math.max(0, hero.spellCooldown - dt);
  hero.reviveCooldown = Math.max(0, hero.reviveCooldown - dt);
  hero.invuln = Math.max(0, hero.invuln - dt);
  hero.mana = clamp(hero.mana + 8 * dt, 0, hero.maxMana);
  hero.hp = clamp(hero.hp + 1.8 * dt, 0, hero.maxHp);
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
  summon.charge += dt;

  if (summon.charge >= summon.holdDuration) {
    placeDefender(placement.x, placement.y);
    summon.charge = 0;
    summon.placement = null;
    summon.lockedUntilRelease = true;
  }
}

function performHeroStrike() {
  const hero = game.hero;
  if (hero.strikeCooldown > 0 || game.gameOver) {
    return;
  }
  hero.strikeCooldown = 0.42;
  const origin = heroCenter();
  addEffect("slash", origin.x + hero.facing * 24, origin.y - 6, "#ffd08d", 0.24, { radius: 34 });

  for (const enemy of game.enemies) {
    const dx = enemy.x - origin.x;
    const dy = enemy.y - origin.y;
    if (Math.sign(dx || hero.facing) === hero.facing && Math.hypot(dx, dy) < 92) {
      enemy.hp -= 22;
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
  hero.mana -= 18;
  const origin = heroCenter();
  game.projectiles.push({
    owner: "hero",
    kind: "bolt",
    x: origin.x + hero.facing * 18,
    y: origin.y - 10,
    vx: hero.facing * 8.6,
    vy: 0,
    radius: 7,
    damage: 24,
    color: "#8af7ff",
    life: 1.6,
  });
  addEffect("ring", origin.x + hero.facing * 10, origin.y - 12, "#8af7ff", 0.22, { radius: 12 });
}

function updateDefenders(dt) {
  for (const defender of game.defenders) {
    if (defender.fallen) {
      defender.fallenTimer += dt;
      continue;
    }

    defender.cooldown -= dt;
    const config = defenderTypes[defender.type];
    const defenderPos = { x: defender.x, y: defender.y };
    const target = game.enemies.find((enemy) => dist(defenderPos, enemy) < config.range);

    if (!target || defender.cooldown > 0) {
      continue;
    }

    defender.cooldown = config.cooldown;
    if (defender.type === "warrior") {
      target.hp -= config.damage;
      target.vx -= 0.25;
      addEffect("slash", target.x, target.y, config.color, 0.2, { radius: 18 });
    } else if (defender.type === "archer") {
      game.projectiles.push({
        owner: "defender",
        subtype: "archer",
        x: defender.x,
        y: defender.y + 8,
        vx: (target.x - defender.x) / 18,
        vy: (target.y - defender.y) / 18,
        radius: 4,
        damage: config.damage,
        color: config.color,
        life: 1.4,
      });
    } else {
      game.projectiles.push({
        owner: "defender",
        subtype: "mage",
        x: defender.x,
        y: defender.y + 10,
        vx: (target.x - defender.x) / 22,
        vy: (target.y - defender.y) / 22,
        radius: 6,
        damage: config.damage,
        splash: config.splash,
        color: config.color,
        life: 1.6,
      });
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
  const hero = game.hero;

  for (const enemy of game.enemies) {
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
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
    const speed = enemy.kind === "harrier" ? 1.65 : 1.45;
    enemy.x += (dx / distance) * speed + enemy.vx * dt * 60;
    enemy.y += (dy / distance) * speed * 0.72 + bob;
    enemy.vx *= 0.97;

    if (distance < 34 && enemy.attackCooldown <= 0) {
      enemy.attackCooldown = 0.92;
      if (target === coreTarget) {
        game.core.hp -= enemy.damage;
        addEffect("spark", game.core.x + 12, game.core.y - 4, "#a3ffb5", 0.28, { radius: 20 });
      } else if (target === heroPos) {
        if (hero.invuln <= 0) {
          hero.hp -= enemy.damage;
          hero.invuln = 0.65;
          addEffect("spark", hero.x + hero.width / 2, hero.y + 18, "#ff9e7c", 0.28, { radius: 18 });
        }
      } else if (!target.fallen) {
        target.hp -= enemy.damage;
        addEffect("spark", target.x, target.y + 12, "#9affbe", 0.28, { radius: 16 });
      }
    }
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
    if (enemy.hp > 0) {
      return true;
    }
    game.essence += 8;
    addEffect("burst", enemy.x, enemy.y, "#79ff9d", 0.36, { radius: 20 });
    return false;
  });
}

function updateProjectiles(dt) {
  for (const projectile of game.projectiles) {
    projectile.life -= dt;
    projectile.x += projectile.vx * 60 * dt;
    projectile.y += projectile.vy * 60 * dt;
  }

  for (const projectile of game.projectiles) {
    if (projectile.life <= 0) {
      continue;
    }

    const hit = game.enemies.find((enemy) => dist(projectile, enemy) < projectile.radius + 18);
    if (!hit) {
      continue;
    }

    hit.hp -= projectile.damage;
    addEffect("spark", projectile.x, projectile.y, projectile.color, 0.22, { radius: 12 });
    if (projectile.splash) {
      for (const enemy of game.enemies) {
        if (enemy !== hit && dist(enemy, projectile) < projectile.splash) {
          enemy.hp -= projectile.damage * 0.55;
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
    showMessage(`Round ${game.wave} preparation. You have 15 seconds to deploy defenders.`, 4.5);
  }
}

function updateState(dt) {
  if (game.gameOver) {
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
}

function drawHero() {
  const hero = game.hero;
  const blink = hero.invuln > 0 && Math.floor(game.time * 20) % 2 === 0;
  if (blink) {
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
  ctx.fillStyle = config.color;
  ctx.fillRect(placement.x - 12, placement.y, 24, 38);

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
    ctx.fillText(`Hold F for 2 seconds over a platform to deploy`, 34, 90);
    ctx.fillText(`Mouse 1 strikes, Mouse 2 casts, R revives`, 34, 112);
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

  if (event.code === "KeyR") {
    tryRevive();
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
  faceHeroToward(x);

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
