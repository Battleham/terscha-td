const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const ui = {
  wave: document.getElementById("wave"),
  enemies: document.getElementById("enemies"),
  selectedUnit: document.getElementById("selectedUnit"),
  essenceLabel: document.getElementById("essenceLabel"),
  heroHealthFill: document.getElementById("heroHealthFill"),
  heroManaFill: document.getElementById("heroManaFill"),
  messageBox: document.getElementById("messageBox"),
  hudPanel: document.querySelector(".hud-panel"),
  gameStage: document.getElementById("gameStage"),
  gameFrame: document.getElementById("gameFrame"),
  mobileBottomBar: document.getElementById("mobileBottomBar"),
  statusStrip: document.getElementById("statusStrip"),
  infoToggle: document.getElementById("infoToggle"),
  infoClose: document.getElementById("infoClose"),
  infoBackdrop: document.getElementById("infoBackdrop"),
  mobileGuideModal: document.getElementById("mobileGuideModal"),
  mobileGuideClose: document.getElementById("mobileGuideClose"),
  orientationGate: document.getElementById("orientationGate"),
  mobileControls: document.getElementById("mobileControls"),
  joystickZone: document.getElementById("joystickZone"),
  joystickBase: document.getElementById("joystickBase"),
  joystickThumb: document.getElementById("joystickThumb"),
  buildToggle: document.getElementById("buildToggle"),
  buildMenu: document.getElementById("buildMenu"),
  cancelPlacementBtn: document.getElementById("cancelPlacementBtn"),
  reviveBtn: document.getElementById("reviveBtn"),
  jumpBtn: document.getElementById("jumpBtn"),
  attackBtn: document.getElementById("attackBtn"),
  magicBtn: document.getElementById("magicBtn"),
  buttons: [...document.querySelectorAll(".legend-button")],
  buildUnitButtons: [...document.querySelectorAll(".mobile-build-unit")],
};

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const GRAVITY = 0.46;
const ENEMY_DEATH_FEET_OFFSET = 66;
const PREVIOUS_FLOOR_Y = HEIGHT - 86;
const FLOOR_Y = HEIGHT - 180;
const PLATFORM_Y_OFFSET = FLOOR_Y - PREVIOUS_FLOOR_Y;
const MAX_ACTIVE_ENEMIES = 5;
const GAME_ART_VERSION = "20260430f";
const PLATFORM_COLLISION_INSET_X = 12;
const HERO_SURFACE_EDGE_GRACE = 0;
const PLATFORM_SNAP_DOWN = 18;
const PLATFORM_SNAP_UP = 8;

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

const generatedSpriteSources = {
  background: `./assets/environment/skyhold_background.png?v=${GAME_ART_VERSION}`,
  arrow: `./assets/effects/arrow.png?v=${GAME_ART_VERSION}`,
};

const generatedSprites = Object.fromEntries(
  Object.entries(generatedSpriteSources).map(([key, source]) => {
    const image = new Image();
    image.src = source;
    return [key, image];
  }),
);

const HERO_SHEET_VERSION = "20260423i";

const animationSources = {
  warrior_idle: "./assets/defenders/warrior_idle.png",
  warrior_attack: "./assets/defenders/warrior_attack.png",
  archer_idle: "./assets/defenders/archer_idle.png",
  archer_attack: "./assets/defenders/archer_attack.png",
  mage_idle: "./assets/defenders/mage_idle.png",
  mage_attack: "./assets/defenders/mage_attack.png",
  hero_idle: `./assets/hero/hero_new_idle_sheet_256.png?v=${HERO_SHEET_VERSION}`,
  hero_walk: `./assets/hero/hero_new_run_sheet_256.png?v=${HERO_SHEET_VERSION}`,
  hero_run: `./assets/hero/hero_new_run_sheet_256.png?v=${HERO_SHEET_VERSION}`,
  hero_jump: `./assets/hero/hero_new_jump_sheet_256.png?v=${HERO_SHEET_VERSION}`,
  hero_hit: `./assets/hero/hero_new_hit_sheet_256.png?v=${HERO_SHEET_VERSION}`,
  hero_defeat: `./assets/hero/hero_new_death_sheet_256.png?v=${HERO_SHEET_VERSION}`,
  hero_melee: `./assets/hero/hero_new_attack_sheet_256.png?v=${HERO_SHEET_VERSION}`,
  hero_magic: `./assets/hero/hero_new_magic_sheet_256.png?v=${HERO_SHEET_VERSION}`,
  enemy_idle: "./assets/enemy/enemy_idle.png",
  enemy_fly: "./assets/enemy/enemy_fly.png",
  enemy_attack: "./assets/enemy/enemy_attack.png",
  enemy_hit: "./assets/enemy/enemy_hit.png",
  enemy_defeat: "./assets/enemy/enemy_defeat.png",
  cloud_platform: `./assets/environment/cloud_platform_sheet.png?v=${GAME_ART_VERSION}`,
  core: `./assets/environment/core_sheet.png?v=${GAME_ART_VERSION}`,
  mage_spell: `./assets/effects/mage_spell_sheet.png?v=${GAME_ART_VERSION}`,
  warrior_slash: `./assets/effects/warrior_slash_sheet.png?v=${GAME_ART_VERSION}`,
};

const animationSheets = Object.fromEntries(
  Object.entries(animationSources).map(([key, source]) => {
    const image = new Image();
    image.src = source;
    return [key, image];
  }),
);

const animationDefs = {
  warrior_idle: { frameWidth: 134, frameHeight: 134, fps: 6, loop: true },
  warrior_attack: { frameWidth: 134, frameHeight: 134, fps: 8.625, loop: false },
  archer_idle: { frameWidth: 138, frameHeight: 138, fps: 6, loop: true },
  archer_attack: { frameWidth: 138, frameHeight: 138, fps: 8.625, loop: false },
  mage_idle: { frameWidth: 108, frameHeight: 108, fps: 6, loop: true },
  mage_attack: { frameWidth: 108, frameHeight: 108, fps: 6, loop: false },
  hero_idle: { frameWidth: 256, frameHeight: 256, fps: 5.625, loop: true },
  hero_walk: { frameWidth: 256, frameHeight: 256, fps: 7.5, loop: true },
  hero_run: { frameWidth: 256, frameHeight: 256, fps: 16.2, loop: true },
  hero_jump: { frameWidth: 256, frameHeight: 256, fps: 9, loop: true },
  hero_hit: { frameWidth: 256, frameHeight: 256, fps: 9, loop: false },
  hero_defeat: { frameWidth: 256, frameHeight: 256, fps: 6, loop: false },
  hero_melee: { frameWidth: 256, frameHeight: 256, fps: 8.25, loop: false },
  hero_magic: { frameWidth: 256, frameHeight: 256, fps: 7.5, loop: false },
  enemy_idle: { frameWidth: 184, frameHeight: 184, fps: 5.25, loop: true },
  enemy_fly: { frameWidth: 184, frameHeight: 184, fps: 7.5, loop: true },
  enemy_attack: { frameWidth: 184, frameHeight: 184, fps: 8.25, loop: false },
  enemy_hit: { frameWidth: 184, frameHeight: 184, fps: 9, loop: false },
  enemy_defeat: { frameWidth: 184, frameHeight: 184, fps: 9, loop: false },
  cloud_platform: { frameWidth: 160, frameHeight: 128, fps: 5, loop: true },
  core: { frameWidth: 256, frameHeight: 256, fps: 8, loop: true },
  mage_spell: { frameWidth: 192, frameHeight: 96, fps: 18, loop: true },
  warrior_slash: { frameWidth: 192, frameHeight: 128, fps: 24, loop: false },
};

const HERO_JUMP_STARTUP_FRAME_COUNT = 6;
const HERO_JUMP_AIR_UP_FRAME = 6;
const HERO_JUMP_AIR_APEX_FRAME = 8;
const HERO_JUMP_AIR_DOWN_FRAME = 10;
const HERO_JUMP_LANDING_START_FRAME = 11;
const HERO_JUMP_LANDING_FRAME_COUNT = 5;
const HERO_JUMP_STARTUP_FRAME_DURATION = 0.055;
const HERO_JUMP_LANDING_FRAME_DURATION = 0.055;
const HERO_JUMP_APEX_UPWARD_SPEED_MIN = -0.08;
const HERO_JUMP_APEX_UPWARD_SPEED_MAX = 0.45;
const HERO_MELEE_RELEASE_FRAME = 5;
const HERO_MAGIC_RELEASE_FRAME = 8;
const HERO_RENDER_SIZE = 108;
const HERO_SPRITE_GROUND_Y = 220;
const HERO_RENDER_SCALE_BY_ANIM = {
  hero_walk: 1.03,
  hero_run: 1.03,
  hero_jump: 1.28,
  hero_hit: 1.08,
  hero_defeat: 1.12,
  hero_melee: 1.22,
  hero_magic: 1.17,
};
const CLOUD_PLATFORM_FRAME_SEQUENCE = [0, 1, 2, 3, 2, 1, 5, 6, 7];

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
  { x: 0, y: FLOOR_Y, width: WIDTH, height: HEIGHT - FLOOR_Y, kind: "floor" },
  { x: 232, y: 512 + PLATFORM_Y_OFFSET, width: 245, height: 16, kind: "platform", collisionInsetX: PLATFORM_COLLISION_INSET_X },
  { x: 456, y: 432 + PLATFORM_Y_OFFSET, width: 252, height: 16, kind: "platform", collisionInsetX: PLATFORM_COLLISION_INSET_X },
  { x: 780, y: 360 + PLATFORM_Y_OFFSET, width: 220, height: 16, kind: "platform", collisionInsetX: 0 },
  { x: 828, y: 532 + PLATFORM_Y_OFFSET, width: 210, height: 16, kind: "platform", collisionInsetX: PLATFORM_COLLISION_INSET_X },
];

const game = {
  time: 0,
  dt: 0,
  lastTime: 0,
  running: true,
  paused: true,
  pauseMode: "ready",
  mobileUi: false,
  orientationBlocked: false,
  resumeAfterOrientation: false,
  infoModalOpen: false,
  resumeAfterInfoModal: false,
  wave: 1,
  totalWaves: 7,
  prepDuration: 15,
  prepTimer: 15,
  essence: 100,
  core: {
    x: 92,
    y: FLOOR_Y - 30,
    radius: 32,
    hp: 250,
    maxHp: 250,
  },
  selectedType: "warrior",
  mouse: { x: 0, y: 0 },
  keys: {},
  mobileStick: {
    active: false,
    pointerId: null,
    radius: 46,
    x: 0,
    y: 0,
    knobX: 0,
    knobY: 0,
  },
  mobileBuildMenuOpen: false,
  mobilePlacement: {
    active: false,
    pointerId: null,
    cancelHover: false,
  },
  mobileSummonCast: {
    active: false,
    x: 0,
    y: 0,
    type: "warrior",
    charge: 0,
  },
  summon: {
    holdDuration: 2,
    charge: 0,
    placement: null,
    lockedUntilRelease: false,
    modeEnabled: true,
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
    jumpStartupFrame: 0,
    jumpStartupTimer: 0,
    jumpLandingActive: false,
    jumpLandingFrame: 0,
    jumpLandingTimer: 0,
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
    meleeReleaseDone: true,
    magicReleaseDone: true,
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
    x: WIDTH + 24 + Math.random() * 36,
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
    deadGrounded: false,
    deathTimer: 0,
    animName: "fly",
    animTime: Math.random() * 0.6,
    facing: -1,
  };
}

function addEffect(type, x, y, color, life = 0.4, extra = {}) {
  game.effects.push({
    ...extra,
    type,
    x,
    y,
    color,
    life,
    maxLife: life,
    radius: extra.radius || 16,
    text: extra.text || "",
    rise: extra.rise || 0,
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
  for (const button of ui.buildUnitButtons) {
    button.classList.toggle("active", button.dataset.type === type);
  }
  ui.selectedUnit.style.backgroundImage = `url("${staticSpriteSources[type]}")`;
  ui.selectedUnit.setAttribute("aria-label", `Selected defender: ${defenderTypes[type].label}`);
}

function shouldUseMobileUi() {
  return window.matchMedia("(max-width: 900px), (hover: none) and (pointer: coarse)").matches;
}

function isPortraitOrientation() {
  return window.matchMedia("(orientation: portrait)").matches;
}

function isPrepPhase() {
  return game.prepTimer > 0;
}

function isPaused() {
  return game.paused && !game.gameOver;
}

function syncPauseStateClass() {
  const paused = isPaused();
  document.body.classList.toggle("game-paused", paused);
  document.body.classList.toggle("pause-ready", paused && game.pauseMode === "ready");
  document.body.dataset.pauseMode = game.pauseMode ?? "";
}

function setPaused(paused, mode = "menu") {
  game.paused = paused;
  game.pauseMode = paused ? mode : null;
  if (paused) {
    for (const code of ["KeyA", "KeyD", "KeyW", "Space"]) {
      game.keys[code] = false;
    }
  } else {
    resetSummonState(true);
    game.reviveAll.charge = 0;
    game.reviveAll.triggered = false;
  }
  syncPauseStateClass();
}

function setVirtualKey(code, pressed, keyValue = code) {
  game.keys[code] = pressed;
  if (typeof keyValue === "string") {
    game.keys[keyValue] = pressed;
  }
}

function clearMobileMovement() {
  setVirtualKey("KeyA", false, "a");
  setVirtualKey("KeyD", false, "d");
  resetMobileStick();
}

function applyMobileStickInput() {
  const deadZone = 0.18;
  setVirtualKey("KeyA", game.mobileStick.x < -deadZone, "a");
  setVirtualKey("KeyD", game.mobileStick.x > deadZone, "d");
}

function syncMobileStickVisual() {
  ui.joystickBase.classList.toggle("is-engaged", game.mobileStick.active);
  ui.joystickThumb.style.transform = `translate3d(${game.mobileStick.knobX}px, ${game.mobileStick.knobY}px, 0)`;
}

function resetMobileStick() {
  game.mobileStick.active = false;
  game.mobileStick.pointerId = null;
  game.mobileStick.x = 0;
  game.mobileStick.y = 0;
  game.mobileStick.knobX = 0;
  game.mobileStick.knobY = 0;
  applyMobileStickInput();
  syncMobileStickVisual();
}

function updateMobileStick(clientX, clientY) {
  const rect = ui.joystickBase.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = clientX - centerX;
  const dy = clientY - centerY;
  const distance = Math.hypot(dx, dy);
  const radius = game.mobileStick.radius;
  const clampedDistance = Math.min(distance, radius);
  const scale = distance > 0 ? clampedDistance / distance : 0;
  const clampedX = dx * scale;
  const clampedY = dy * scale * 0.18;

  game.mobileStick.knobX = clampedX;
  game.mobileStick.knobY = clampedY;
  game.mobileStick.x = clampedX / radius;
  game.mobileStick.y = clampedY / radius;
  applyMobileStickInput();
  syncMobileStickVisual();
}

function openInfoModal() {
  if (!game.mobileUi || game.infoModalOpen) {
    return;
  }
  resetMobilePlacement();
  game.infoModalOpen = true;
  game.resumeAfterInfoModal = !isPaused() && !game.gameOver;
  if (game.resumeAfterInfoModal) {
    setPaused(true, "menu");
  }
  ui.infoBackdrop.hidden = false;
  if (ui.mobileGuideModal) {
    ui.mobileGuideModal.hidden = false;
  }
  document.body.classList.add("info-modal-open");
}

function closeInfoModal() {
  if (!game.infoModalOpen) {
    return;
  }
  const shouldResume = game.resumeAfterInfoModal && !game.gameOver;
  game.infoModalOpen = false;
  game.resumeAfterInfoModal = false;
  ui.infoBackdrop.hidden = true;
  if (ui.mobileGuideModal) {
    ui.mobileGuideModal.hidden = true;
  }
  document.body.classList.remove("info-modal-open");
  if (shouldResume) {
    setPaused(false);
  }
}

async function requestLandscapeLock() {
  if (!game.mobileUi || typeof screen.orientation?.lock !== "function") {
    return;
  }
  try {
    await screen.orientation.lock("landscape");
  } catch (_error) {
    // Many mobile browsers only allow this in fullscreen/PWA or not at all.
  }
}

function updateOrientationState() {
  const shouldBlock = game.mobileUi && isPortraitOrientation();
  if (game.orientationBlocked === shouldBlock) {
    return;
  }

  game.orientationBlocked = shouldBlock;
  document.body.classList.toggle("orientation-blocked", shouldBlock);
  ui.orientationGate.hidden = !shouldBlock;

  if (shouldBlock) {
    clearMobileMovement();
    if (game.infoModalOpen) {
      closeInfoModal();
    }
    game.resumeAfterOrientation = !isPaused() && !game.gameOver;
    if (game.resumeAfterOrientation) {
      setPaused(true, "menu");
    }
    return;
  }

  if (game.resumeAfterOrientation && !game.gameOver && game.pauseMode !== "ready") {
    game.resumeAfterOrientation = false;
    setPaused(false);
  }
}

function layoutMobileScene() {
  if (!game.mobileUi) {
    ui.gameFrame.style.width = "";
    ui.gameFrame.style.height = "";
    return;
  }
  ui.gameFrame.style.width = `${window.innerWidth}px`;
  ui.gameFrame.style.height = `${window.innerHeight}px`;
  game.mobileStick.radius = Math.max(18, (ui.joystickBase.offsetWidth - ui.joystickThumb.offsetWidth) / 2);
  syncMobileStickVisual();
}

function getCanvasViewportInsets() {
  const frameWidth = ui.gameFrame.clientWidth || window.innerWidth || WIDTH;
  const frameHeight = ui.gameFrame.clientHeight || window.innerHeight || HEIGHT;
  const frameAspect = frameWidth / Math.max(frameHeight, 1);
  const canvasAspect = WIDTH / HEIGHT;

  if (frameAspect > canvasAspect) {
    const visibleHeight = WIDTH / frameAspect;
    return {
      insetX: 0,
      insetY: Math.max(0, (HEIGHT - visibleHeight) / 2),
      visibleWidth: WIDTH,
      visibleHeight,
    };
  }

  const visibleWidth = HEIGHT * frameAspect;
  return {
    insetX: Math.max(0, (WIDTH - visibleWidth) / 2),
    insetY: 0,
    visibleWidth,
    visibleHeight: HEIGHT,
  };
}

function updateMobileBuildUi() {
  const showMobile = game.mobileUi;
  if (ui.buildToggle) {
    ui.buildToggle.hidden = !showMobile;
    ui.buildToggle.classList.toggle("is-active", showMobile && game.mobileBuildMenuOpen);
    ui.buildToggle.setAttribute("aria-expanded", String(showMobile && game.mobileBuildMenuOpen));
  }
  if (ui.buildMenu) {
    ui.buildMenu.hidden = !(showMobile && game.mobileBuildMenuOpen);
  }
  if (ui.cancelPlacementBtn) {
    ui.cancelPlacementBtn.hidden = !(showMobile && game.mobilePlacement.active);
    ui.cancelPlacementBtn.classList.toggle("is-hot", showMobile && game.mobilePlacement.cancelHover);
  }
  for (const button of ui.buildUnitButtons) {
    const type = button.dataset.type;
    const config = defenderTypes[type];
    button.style.backgroundImage = `url("${staticSpriteSources[type]}")`;
    button.classList.toggle("active", type === game.selectedType);
    button.classList.toggle("is-unaffordable", game.essence < config.cost);
  }
}

function setMobileBuildMenuOpen(open) {
  game.mobileBuildMenuOpen = Boolean(open);
  updateMobileBuildUi();
}

function updateMobileUiState(force = false) {
  const useMobileUi = shouldUseMobileUi();
  if (!force && game.mobileUi === useMobileUi) {
    updateOrientationState();
    updateMobileBuildUi();
    requestAnimationFrame(layoutMobileScene);
    return;
  }

  game.mobileUi = useMobileUi;
  document.body.classList.toggle("mobile-ui", useMobileUi);
  ui.mobileControls.setAttribute("aria-hidden", String(!useMobileUi));
  if (useMobileUi) {
    closeInfoModal();
    if (isPrepPhase() && !game.gameOver) {
      setPlacementMode(true);
    } else {
      setPlacementMode(false);
    }
    requestLandscapeLock();
  } else {
    clearMobileMovement();
    closeInfoModal();
    game.mobileBuildMenuOpen = false;
  }
  updateOrientationState();
  updateMobileBuildUi();
  requestAnimationFrame(layoutMobileScene);
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

function setMouseFromClient(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = WIDTH / rect.width;
  const scaleY = HEIGHT / rect.height;
  game.mouse.x = (clientX - rect.left) * scaleX;
  game.mouse.y = (clientY - rect.top) * scaleY;
}

function clientPointInside(element, clientX, clientY) {
  if (!element || element.hidden) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

function staticSpriteReady(name) {
  const sprite = staticSprites[name];
  return Boolean(sprite && sprite.complete && sprite.naturalWidth > 0);
}

function generatedSpriteReady(name) {
  const sprite = generatedSprites[name];
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

function drawGeneratedSprite(name, x, y, width, height, options = {}) {
  const sprite = generatedSprites[name];
  if (!generatedSpriteReady(name)) {
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

function drawTintedStaticSprite(name, x, y, width, height, tint, alpha = 1) {
  const sprite = staticSprites[name];
  if (!staticSpriteReady(name)) {
    return false;
  }

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = Math.max(1, Math.ceil(width));
  tempCanvas.height = Math.max(1, Math.ceil(height));
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.imageSmoothingEnabled = false;
  tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
  tempCtx.drawImage(sprite, 0, 0, tempCanvas.width, tempCanvas.height);
  tempCtx.globalCompositeOperation = "source-atop";
  tempCtx.fillStyle = tint;
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(tempCanvas, x, y, width, height);
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
  const frameSequence = Array.isArray(options.frameSequence) && options.frameSequence.length > 0
    ? options.frameSequence
    : null;
  let frameIndex;
  if (frameSequence) {
    let sequenceIndex = Math.floor(elapsed * def.fps);
    if (def.loop) {
      sequenceIndex %= frameSequence.length;
    } else {
      sequenceIndex = Math.min(frameSequence.length - 1, sequenceIndex);
    }
    frameIndex = clamp(frameSequence[sequenceIndex], 0, frameCount - 1);
  } else {
    frameIndex = Math.floor(elapsed * def.fps);
    if (def.loop) {
      frameIndex %= frameCount;
    } else {
      frameIndex = Math.min(frameCount - 1, frameIndex);
    }
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

function isKeyHeld(...keys) {
  return keys.some((key) => Boolean(game.keys[key]));
}

function canAffordSelectedDefender() {
  return game.essence >= defenderTypes[game.selectedType].cost;
}

function getLiveEnemies() {
  return game.enemies.filter((enemy) => !enemy.dead);
}

function getLiveEnemyCount() {
  return getLiveEnemies().length;
}

function resetSummonState(resetLock = false) {
  game.summon.charge = 0;
  game.summon.placement = null;
  if (resetLock) {
    game.summon.lockedUntilRelease = false;
  }
}

function resetMobilePlacement() {
  game.mobilePlacement.active = false;
  game.mobilePlacement.pointerId = null;
  game.mobilePlacement.cancelHover = false;
  updateMobileBuildUi();
}

function resetMobileSummonCast() {
  game.mobileSummonCast.active = false;
  game.mobileSummonCast.charge = 0;
}

function interruptSummonCast() {
  const hadDesktopCast = game.summon.charge > 0 && game.summon.placement && !isPrepPhase();
  const hadMobileCast = game.mobileSummonCast.active;
  if (!hadDesktopCast && !hadMobileCast) {
    return false;
  }

  resetSummonState(true);
  resetMobileSummonCast();
  addEffect("text", game.hero.x + game.hero.width / 2, game.hero.y - 54, "#ff7a7a", 0.8, {
    text: "Interrupted!",
    rise: 26,
  });
  return true;
}

function setPlacementMode(enabled, announce = false) {
  game.summon.modeEnabled = enabled;
  resetSummonState(true);
  if (!enabled) {
    resetMobilePlacement();
    resetMobileSummonCast();
  }
  if (game.mobileUi) {
    game.mobileBuildMenuOpen = Boolean(enabled);
  }
  updateMobileBuildUi();
  if (!announce) {
    return;
  }
  showMessage(enabled ? "Placement mode engaged." : "Placement mode dismissed.");
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

function getSurfaceBounds(surface) {
  const leftInsetX = surface.collisionLeftInsetX ?? surface.collisionInsetX ?? 0;
  const rightInsetX = surface.collisionRightInsetX ?? surface.collisionInsetX ?? 0;
  return {
    left: surface.x + leftInsetX,
    right: surface.x + surface.width - rightInsetX,
    top: surface.y,
    bottom: surface.y + surface.height,
  };
}

function overlapsSurfaceX(surface, left, right, edgeGrace = 0) {
  const bounds = getSurfaceBounds(surface);
  return right - edgeGrace > bounds.left && left + edgeGrace < bounds.right;
}

function surfaceAt(x, y, tolerance = 18) {
  let bestSurface = null;
  let bestScore = Infinity;

  for (const surface of surfaces) {
    const bounds = getSurfaceBounds(surface);
    const withinX = x >= bounds.left + 8 && x <= bounds.right - 8;
    const closeY = y <= bounds.top + 24 && y >= bounds.top - 150 - tolerance;
    if (!withinX || !closeY) {
      continue;
    }

    const score = Math.abs(bounds.top - y);
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
    return false;
  }

  const placement = validPlacement(x, y);
  const config = defenderTypes[game.selectedType];
  if (!placement) {
    showMessage("Defenders need stable footing on the ground or a platform.");
    return false;
  }

  if (game.essence < config.cost) {
    showMessage(`Not enough essence for a ${config.label.toLowerCase()}.`);
    return false;
  }

  game.essence -= config.cost;
  game.defenders.push(createDefender(game.selectedType, placement.x, placement.y));
  addEffect("ring", placement.x, placement.y + 20, config.color, 0.45, { radius: 18 });
  showMessage(`${config.label} deployed to the line.`);
  return true;
}

function beginMobileSummonCast(x, y) {
  const placement = validPlacement(x, y);
  if (!placement) {
    showMessage("Defenders need stable footing on the ground or a platform.");
    return false;
  }
  if (!canAffordSelectedDefender()) {
    showMessage(`Not enough essence for a ${defenderTypes[game.selectedType].label.toLowerCase()}.`);
    return false;
  }
  game.mobileSummonCast.active = true;
  game.mobileSummonCast.x = placement.x;
  game.mobileSummonCast.y = placement.y;
  game.mobileSummonCast.type = game.selectedType;
  game.mobileSummonCast.charge = 0;
  return true;
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
  enemy.deadGrounded = false;
  enemy.vx *= 0.22;
  enemy.vy = 0;
  enemy.deathTimer = Math.max(1, getAnimationFrameCount("enemy_defeat") / animationDefs.enemy_defeat.fps);
  enemy.hitAnimTimer = 0;
  enemy.attackAnimTimer = 0;
  setAnimation(enemy, "defeat");
  addEffect("burst", enemy.x, enemy.y, "#79ff9d", 0.36, { radius: 20 });
}

function getEnemyFeetY(enemy) {
  return enemy.y + ENEMY_DEATH_FEET_OFFSET;
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
  interruptSummonCast();
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

function finishReviveInput() {
  const didHoldLongEnough = game.reviveAll.charge >= game.reviveAll.holdDuration;
  const wasTriggered = game.reviveAll.triggered;
  game.reviveAll.charge = 0;
  game.reviveAll.triggered = false;
  if (!didHoldLongEnough && !wasTriggered) {
    tryRevive();
  }
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

  let landedSurface = null;
  const previousFeetY = hero.y + hero.height - hero.vy;
  const currentFeetY = hero.y + hero.height;
  for (const surface of surfaces) {
    const bounds = getSurfaceBounds(surface);
    const crossesTop = previousFeetY <= bounds.top && currentFeetY >= bounds.top;
    const closeEnoughToTop = currentFeetY >= bounds.top - PLATFORM_SNAP_UP && currentFeetY <= bounds.top + PLATFORM_SNAP_DOWN;
    const withinX = overlapsSurfaceX(surface, hero.x, hero.x + hero.width, HERO_SURFACE_EDGE_GRACE);
    if (
      hero.vy >= 0 &&
      withinX &&
      (crossesTop || closeEnoughToTop) &&
      (!landedSurface || bounds.top < getSurfaceBounds(landedSurface).top)
    ) {
      landedSurface = surface;
    }
  }

  if (landedSurface) {
    const bounds = getSurfaceBounds(landedSurface);
    hero.y = bounds.top - hero.height;
    hero.vy = 0;
    hero.onGround = true;
    hero.jumpBoostTimer = 0;
    hero.jumpHangTimer = 0;
    if (!wasOnGround) {
      hero.jumpLandingActive = true;
      hero.jumpLandingFrame = 0;
      hero.jumpLandingTimer = 0;
    }
  }

  hero.strikeCooldown = Math.max(0, hero.strikeCooldown - dt);
  hero.spellCooldown = Math.max(0, hero.spellCooldown - dt);
  hero.reviveCooldown = Math.max(0, hero.reviveCooldown - dt);
  hero.invuln = Math.max(0, hero.invuln - dt);
  hero.meleeAnimTimer = Math.max(0, hero.meleeAnimTimer - dt);
  hero.magicAnimTimer = Math.max(0, hero.magicAnimTimer - dt);
  hero.hitAnimTimer = Math.max(0, hero.hitAnimTimer - dt);
  hero.mana = clamp(hero.mana + 8 * dt, 0, hero.maxMana);
  hero.hp = clamp(hero.hp + 1.8 * dt, 0, hero.maxHp);

  if (!hero.onGround) {
    hero.jumpLandingActive = false;
    hero.jumpLandingFrame = 0;
    hero.jumpLandingTimer = 0;
    if (hero.jumpStartupFrame < HERO_JUMP_STARTUP_FRAME_COUNT) {
      hero.jumpStartupTimer += dt;
      while (
        hero.jumpStartupTimer >= HERO_JUMP_STARTUP_FRAME_DURATION &&
        hero.jumpStartupFrame < HERO_JUMP_STARTUP_FRAME_COUNT
      ) {
        hero.jumpStartupTimer -= HERO_JUMP_STARTUP_FRAME_DURATION;
        hero.jumpStartupFrame += 1;
      }
    }
  } else {
    hero.jumpStartupFrame = 0;
    hero.jumpStartupTimer = 0;
    if (hero.jumpLandingActive) {
      hero.jumpLandingTimer += dt;
      if (
        hero.jumpLandingFrame < HERO_JUMP_LANDING_FRAME_COUNT - 1 &&
        hero.jumpLandingTimer >= HERO_JUMP_LANDING_FRAME_DURATION
      ) {
        hero.jumpLandingTimer -= HERO_JUMP_LANDING_FRAME_DURATION;
        hero.jumpLandingFrame += 1;
      } else if (
        hero.jumpLandingFrame >= HERO_JUMP_LANDING_FRAME_COUNT - 1 &&
        hero.jumpLandingTimer >= HERO_JUMP_LANDING_FRAME_DURATION
      ) {
        hero.jumpLandingActive = false;
        hero.jumpLandingTimer = 0;
      }
    }
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
  } else if (!hero.onGround || hero.jumpLandingActive) {
    animName = "jump";
  } else if (Math.abs(hero.vx) > hero.walkSpeed + 0.2) {
    animName = "run";
  } else if (Math.abs(hero.vx) > 0.2) {
    animName = "walk";
  }

  setAnimation(hero, animName);
  hero.animTime += dt;
  resolveHeroAnimationEvents(hero);
}

function placementsMatch(a, b) {
  return Boolean(a && b && Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1);
}

function updateSummon(dt) {
  const summon = game.summon;
  if (game.gameOver || isPaused() || !summon.modeEnabled) {
    resetSummonState();
    return;
  }

  const placement = validPlacement(game.mouse.x, game.mouse.y);
  const holding = isKeyHeld("KeyF", "f", "F");

  if (!holding) {
    resetSummonState(true);
    return;
  }

  if (!placement) {
    summon.charge = 0;
    summon.placement = placement;
    return;
  }

  const previousPlacement = summon.placement;
  summon.placement = placement;

  if (summon.lockedUntilRelease) {
    return;
  }

  if (isPrepPhase()) {
    placeDefender(placement.x, placement.y);
    summon.lockedUntilRelease = true;
    summon.charge = 0;
    return;
  }

  if (!placementsMatch(previousPlacement, placement)) {
    summon.charge = 0;
  }

  summon.charge += dt;
  if (summon.charge >= summon.holdDuration) {
    placeDefender(placement.x, placement.y);
    summon.charge = 0;
    summon.placement = null;
    summon.lockedUntilRelease = true;
  }
}

function updateReviveAll(dt) {
  const hold = game.reviveAll;
  const canCharge = isPrepPhase() && getFallenDefenders().length > 0 && isKeyHeld("KeyR", "r", "R");

  if (!canCharge) {
    if (!isKeyHeld("KeyR", "r", "R")) {
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

function updateMobileSummonCast(dt) {
  const cast = game.mobileSummonCast;
  if (!cast.active) {
    return;
  }
  if (game.gameOver || isPaused() || isPrepPhase()) {
    resetMobileSummonCast();
    return;
  }

  cast.charge += dt;
  if (cast.charge < game.summon.holdDuration) {
    return;
  }

  const previousType = game.selectedType;
  game.selectedType = cast.type;
  placeDefender(cast.x, cast.y);
  game.selectedType = previousType;
  resetMobileSummonCast();
}

function performHeroStrike() {
  interruptSummonCast();
  const hero = game.hero;
  if (hero.strikeCooldown > 0 || game.gameOver) {
    return;
  }
  const meleeFrames = getAnimationFrameCount("hero_melee") || 10;
  hero.strikeCooldown = 0.42;
  hero.meleeAnimTimer = meleeFrames / animationDefs.hero_melee.fps;
  hero.meleeReleaseDone = false;
  hero.animName = "melee";
  hero.animTime = 0;
}

function castHeroBolt() {
  interruptSummonCast();
  const hero = game.hero;
  if (hero.spellCooldown > 0 || hero.mana < 18 || game.gameOver) {
    return;
  }

  const magicFrames = getAnimationFrameCount("hero_magic") || 12;
  hero.spellCooldown = 0.55;
  hero.magicAnimTimer = magicFrames / animationDefs.hero_magic.fps;
  hero.magicReleaseDone = false;
  hero.animName = "magic";
  hero.animTime = 0;
  hero.mana -= 18;
}

function getAnimationFrameNumber(name, elapsed) {
  const frameCount = getAnimationFrameCount(name);
  if (!frameCount) {
    return 1;
  }
  const def = animationDefs[name];
  const frameIndex = def.loop
    ? Math.floor(elapsed * def.fps) % frameCount
    : Math.min(frameCount - 1, Math.floor(elapsed * def.fps));
  return frameIndex + 1;
}

function resolveHeroStrikeRelease(hero) {
  const origin = heroCenter();
  addEffect("slash", origin.x + hero.facing * 28, origin.y - 8, "#ffd08d", 0.32, {
    radius: 34,
    facing: hero.facing,
  });

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

function resolveHeroMagicRelease(hero) {
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

function resolveHeroAnimationEvents(hero) {
  if (hero.meleeAnimTimer > 0 && !hero.meleeReleaseDone) {
    const frameNumber = getAnimationFrameNumber("hero_melee", hero.animTime);
    if (frameNumber >= HERO_MELEE_RELEASE_FRAME) {
      resolveHeroStrikeRelease(hero);
      hero.meleeReleaseDone = true;
    }
  }

  if (hero.magicAnimTimer > 0 && !hero.magicReleaseDone) {
    const frameNumber = getAnimationFrameNumber("hero_magic", hero.animTime);
    if (frameNumber >= HERO_MAGIC_RELEASE_FRAME) {
      resolveHeroMagicRelease(hero);
      hero.magicReleaseDone = true;
    }
  }
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
          addEffect("slash", defender.attackTarget.x, defender.attackTarget.y, config.color, 0.28, {
            radius: 18,
            facing: defender.facing,
          });
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
      if (!enemy.deadGrounded) {
        const previousFeetY = getEnemyFeetY(enemy);
        enemy.vy += GRAVITY * 1.7;
        enemy.x += enemy.vx * dt * 60;
        enemy.y += enemy.vy;
        enemy.vx *= 0.985;

        for (const surface of surfaces) {
          const overlapsX = overlapsSurfaceX(surface, enemy.x - 18, enemy.x + 18);
          const enemyFeetY = getEnemyFeetY(enemy);
          const surfaceTop = getSurfaceBounds(surface).top;
          const crossedSurface = previousFeetY <= surfaceTop && enemyFeetY >= surfaceTop;
          if (overlapsX && crossedSurface) {
            enemy.y = surfaceTop - ENEMY_DEATH_FEET_OFFSET;
            enemy.vy = 0;
            enemy.vx = 0;
            enemy.deadGrounded = true;
            break;
          }
        }
      } else {
        enemy.deathTimer = Math.max(0, enemy.deathTimer - dt);
      }
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
      setPlacementMode(false);
      showMessage(`Round ${game.wave} begins. Hold the rampart.`, 3.2);
    }
    return;
  }

  game.spawnAccumulator += dt;
  const spawnDelay = Math.max(0.38, 1.05 - game.wave * 0.07);
  let liveEnemyCount = getLiveEnemyCount();

  if (
    game.waveSpawned < game.waveSpawnTarget &&
    liveEnemyCount < MAX_ACTIVE_ENEMIES &&
    game.spawnAccumulator >= spawnDelay
  ) {
    game.enemies.push(createEnemy(game.wave));
    game.waveSpawned += 1;
    game.spawnAccumulator = 0;
    liveEnemyCount += 1;
  }

  if (game.waveSpawned >= game.waveSpawnTarget && liveEnemyCount === 0) {
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
    setPlacementMode(true);
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

  game.time += dt;

  if (isPaused()) {
    updateEffects(dt);
    return;
  }

  game.dt = dt;

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
  updateMobileSummonCast(dt);
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
  ui.wave.textContent = isPrepPhase() ? `${game.wave} · Prep` : `${game.wave}`;
  ui.essenceLabel.textContent = `Essence: ${Math.floor(game.essence)}`;
  ui.heroHealthFill.style.width = `${(Math.max(0, game.hero.hp) / game.hero.maxHp) * 100}%`;
  ui.heroManaFill.style.width = `${(game.hero.mana / game.hero.maxMana) * 100}%`;
  ui.enemies.textContent = `${getLiveEnemyCount()}`;
  if (ui.reviveBtn) {
    const reviveProgress = isPrepPhase() ? clamp(game.reviveAll.charge / game.reviveAll.holdDuration, 0, 1) : 0;
    ui.reviveBtn.style.setProperty("--hold-progress", `${reviveProgress}turn`);
    ui.reviveBtn.classList.toggle("is-charging", reviveProgress > 0);
  }
  updateMobileBuildUi();
}

function drawBackground() {
  if (generatedSpriteReady("background")) {
    ctx.drawImage(generatedSprites.background, 0, 0, WIDTH, HEIGHT);

    const readability = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    readability.addColorStop(0, "rgba(3, 8, 16, 0.08)");
    readability.addColorStop(0.58, "rgba(3, 8, 16, 0.03)");
    readability.addColorStop(1, "rgba(3, 8, 16, 0.32)");
    ctx.fillStyle = readability;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    return;
  }

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
  for (const [index, surface] of surfaces.entries()) {
    if (index === 0) {
      if (!generatedSpriteReady("background")) {
        const gradient = ctx.createLinearGradient(0, surface.y, 0, surface.y + surface.height);
        gradient.addColorStop(0, "#537085");
        gradient.addColorStop(1, "#223645");
        ctx.fillStyle = gradient;
        ctx.fillRect(surface.x, surface.y, surface.width, surface.height);
        ctx.fillStyle = "rgba(234, 247, 255, 0.18)";
        ctx.fillRect(surface.x, surface.y, surface.width, 3);
      }
      continue;
    }

    if (animationReady("cloud_platform")) {
      const platformHeight = 92;
      const platformWidth = surface.width + 34;
      const platformX = surface.x - 17;
      const platformY = surface.y - platformHeight * 0.42;
      drawAnimation("cloud_platform", platformX, platformY, platformWidth, platformHeight, game.time + index * 0.23, {
        frameSequence: CLOUD_PLATFORM_FRAME_SEQUENCE,
      });
      continue;
    }

    const gradient = ctx.createLinearGradient(0, surface.y, 0, surface.y + surface.height);
    gradient.addColorStop(0, "#537085");
    gradient.addColorStop(1, "#223645");
    ctx.fillStyle = gradient;
    ctx.fillRect(surface.x, surface.y, surface.width, surface.height);

    ctx.fillStyle = "rgba(191, 230, 255, 0.18)";
    ctx.fillRect(surface.x, surface.y, surface.width, 4);
  }

  ctx.fillStyle = "#314858";
  ctx.fillRect(game.core.x - 50, FLOOR_Y - 12, 100, 12);

  ctx.fillStyle = "rgba(255, 212, 132, 0.18)";
  ctx.fillRect(game.core.x - 34, FLOOR_Y - 18, 68, 6);

  if (animationReady("core")) {
    const pulse = 1 + Math.sin(game.time * 3.2) * 0.035;
    drawAnimation(
      "core",
      game.core.x - 60 * pulse,
      game.core.y - 82 * pulse,
      120 * pulse,
      164 * pulse,
      game.time,
    );
  } else {
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
}

function drawCoreHealthBar() {
  const barWidth = 92;
  const barHeight = 8;
  const x = game.core.x - barWidth / 2;
  const y = game.core.y - (animationReady("core") ? 104 : 50);

  ctx.fillStyle = "rgba(7, 16, 28, 0.82)";
  ctx.fillRect(x - 7, y - 16, barWidth + 14, 26);
  ctx.strokeStyle = "rgba(155, 208, 255, 0.24)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 7, y - 16, barWidth + 14, 26);

  ctx.fillStyle = "#d5e8f7";
  ctx.font = '12px "Avenir Next", "Segoe UI", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("Core", game.core.x, y - 4);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(x, y, barWidth, barHeight);
  ctx.fillStyle = "#7bff9d";
  ctx.fillRect(x, y, barWidth * Math.max(0, game.core.hp / game.core.maxHp), barHeight);
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, barWidth, barHeight);
  ctx.textAlign = "left";
}

function drawHero() {
  const hero = game.hero;
  const blink = hero.invuln > 0 && Math.floor(game.time * 20) % 2 === 0;
  if (blink) {
    return;
  }

  ctx.fillStyle = "rgba(6, 10, 16, 0.38)";
  ctx.beginPath();
  ctx.ellipse(hero.x + hero.width / 2, hero.y + hero.height + 4, 22, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  const animKey = `hero_${hero.hp <= 0 ? "defeat" : hero.animName}`;
  const heroFeetY = hero.y + hero.height;
  const renderScale = HERO_RENDER_SCALE_BY_ANIM[animKey] ?? 1;
  const heroRenderWidth = HERO_RENDER_SIZE * renderScale;
  const heroRenderHeight = HERO_RENDER_SIZE * renderScale;
  const animDef = animationDefs[animKey];
  const spriteGroundRatio = HERO_SPRITE_GROUND_Y / (animDef?.frameHeight ?? 256);
  const heroRenderX = hero.x + hero.width / 2 - heroRenderWidth / 2;
  const heroRenderY = heroFeetY - heroRenderHeight * spriteGroundRatio;
  let frameOverride;
  if (animKey === "hero_jump") {
    if (hero.onGround && hero.jumpLandingActive) {
      frameOverride = HERO_JUMP_LANDING_START_FRAME + clamp(hero.jumpLandingFrame, 0, HERO_JUMP_LANDING_FRAME_COUNT - 1);
    } else if (hero.vy < 0) {
      if (hero.jumpStartupFrame < HERO_JUMP_STARTUP_FRAME_COUNT) {
        frameOverride = clamp(hero.jumpStartupFrame, 0, HERO_JUMP_STARTUP_FRAME_COUNT - 1);
      } else {
        frameOverride = -hero.vy > HERO_JUMP_APEX_UPWARD_SPEED_MAX
          ? HERO_JUMP_AIR_UP_FRAME
          : HERO_JUMP_AIR_APEX_FRAME;
      }
    } else {
      const upwardSpeed = -hero.vy;
      if (
        upwardSpeed >= HERO_JUMP_APEX_UPWARD_SPEED_MIN &&
        upwardSpeed <= HERO_JUMP_APEX_UPWARD_SPEED_MAX
      ) {
        frameOverride = HERO_JUMP_AIR_APEX_FRAME;
      } else if (upwardSpeed < HERO_JUMP_APEX_UPWARD_SPEED_MIN) {
        frameOverride = HERO_JUMP_AIR_DOWN_FRAME;
      } else {
        frameOverride = HERO_JUMP_AIR_UP_FRAME;
      }
    }
  }
  if (
    drawAnimation(
      animKey,
      heroRenderX,
      heroRenderY,
      heroRenderWidth,
      heroRenderHeight,
      hero.animTime,
      { flipX: hero.facing < 0, frameOverride },
    )
  ) {
  } else {
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

  if (game.reviveAll.charge > 0) {
    const progress = clamp(game.reviveAll.charge / game.reviveAll.holdDuration, 0, 1);
    const ringX = hero.x + hero.width / 2 + 4;
    const ringY = hero.y - 34;
    drawCastRing(ringX, ringY, progress, {
      fillColor: game.essence >= getMassReviveCost() ? "#92ffd3" : "#ff9d86",
      label: "REVIVE",
    });
  }

  const desktopSummonProgress =
    !isPrepPhase() && game.summon.placement ? clamp(game.summon.charge / game.summon.holdDuration, 0, 1) : 0;
  const mobileSummonProgress = game.mobileSummonCast.active
    ? clamp(game.mobileSummonCast.charge / game.summon.holdDuration, 0, 1)
    : 0;
  const summonProgress = Math.max(desktopSummonProgress, mobileSummonProgress);
  if (summonProgress > 0) {
    drawCastBar(hero.x + hero.width / 2, hero.y - 18, summonProgress, {
      label: "RALLY",
      fillColor: canAffordSelectedDefender() ? "#f7c96a" : "#ff9d86",
    });
  }
}

function drawDefender(defender) {
  const config = defenderTypes[defender.type];
  const usesAnimatedSheet =
    defender.type === "warrior" || defender.type === "archer" || defender.type === "mage";
  const spriteWidth = defender.type === "archer" ? 84 : defender.type === "mage" ? 76 : 82;
  const spriteHeight = defender.type === "archer" ? 84 : defender.type === "mage" ? 76 : 82;
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
    const angle = Math.atan2(projectile.vy, projectile.vx);
    if (
      projectile.subtype === "archer" &&
      drawGeneratedSprite("arrow", projectile.x - 34, projectile.y - 10, 68, 20, { rotation: angle })
    ) {
      continue;
    }

    if (
      (projectile.subtype === "mage" || projectile.kind === "bolt") &&
      drawAnimation("mage_spell", projectile.x - 42, projectile.y - 22, 84, 44, game.time + projectile.life, {
        rotation: angle,
      })
    ) {
      continue;
    }

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
    } else if (effect.type === "text") {
      ctx.font = '18px "Avenir Next", "Segoe UI", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(effect.text, effect.x, effect.y - (1 - alpha) * effect.rise);
      ctx.textAlign = "left";
    } else if (effect.type === "slash") {
      const facing = effect.facing ?? 1;
      const elapsed = effect.maxLife - effect.life;
      if (
        drawAnimation(
          "warrior_slash",
          effect.x - effect.radius * 1.9,
          effect.y - effect.radius * 1.25,
          effect.radius * 3.8,
          effect.radius * 2.5,
          elapsed,
          { flipX: facing < 0, alpha },
        )
      ) {
        ctx.restore();
        continue;
      }

      ctx.lineWidth = 3;
      const start = effect.startAngle ?? -0.7;
      const end = effect.endAngle ?? 1.6;
      ctx.translate(effect.x, effect.y);
      ctx.scale(facing < 0 ? -1 : 1, 1);
      ctx.beginPath();
      ctx.arc(0, 0, effect.radius, start, end);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawCastRing(x, y, progress, options = {}) {
  const radius = options.radius ?? 18;
  const lineWidth = options.lineWidth ?? 4;
  const trackColor = options.trackColor ?? "rgba(230, 244, 255, 0.35)";
  const fillColor = options.fillColor ?? "#92ffd3";
  const label = options.label ?? "";
  const labelWidth = options.labelWidth ?? 52;
  const labelOffsetY = options.labelOffsetY ?? 38;
  const labelTextOffsetY = options.labelTextOffsetY ?? 27;

  ctx.save();
  ctx.strokeStyle = trackColor;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();

  if (progress > 0) {
    ctx.strokeStyle = fillColor;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(progress, 0, 1));
    ctx.stroke();
  }

  if (label) {
    ctx.fillStyle = "rgba(7, 16, 28, 0.78)";
    ctx.fillRect(x - labelWidth / 2, y - labelOffsetY, labelWidth, 14);
    ctx.fillStyle = "#e7f3ff";
    ctx.font = '10px "Avenir Next", "Segoe UI", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(label, x, y - labelTextOffsetY);
    ctx.textAlign = "left";
  }
  ctx.restore();
}

function drawCastBar(x, y, progress, options = {}) {
  const width = options.width ?? 74;
  const height = options.height ?? 8;
  const label = options.label ?? "";
  const fillColor = options.fillColor ?? "#92ffd3";
  const trackColor = options.trackColor ?? "rgba(255,255,255,0.1)";
  const frameColor = options.frameColor ?? "rgba(155, 208, 255, 0.22)";

  ctx.save();
  if (label) {
    ctx.fillStyle = "rgba(7, 16, 28, 0.78)";
    ctx.fillRect(x - width / 2, y - 18, width, 12);
    ctx.fillStyle = "#e7f3ff";
    ctx.font = '10px "Avenir Next", "Segoe UI", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(label, x, y - 9);
  }
  ctx.fillStyle = trackColor;
  ctx.fillRect(x - width / 2, y, width, height);
  ctx.fillStyle = fillColor;
  ctx.fillRect(x - width / 2, y, width * clamp(progress, 0, 1), height);
  ctx.strokeStyle = frameColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - width / 2, y, width, height);
  ctx.textAlign = "left";
  ctx.restore();
}

function drawPlacementPreview() {
  if (isPaused() || !game.summon.modeEnabled) {
    return;
  }
  if (game.mobileUi && !game.mobilePlacement.active && !game.mobileSummonCast.active) {
    return;
  }

  const cast = game.mobileSummonCast;
  const placement =
    game.mobileUi && cast.active ? { x: cast.x, y: cast.y } : validPlacement(game.mouse.x, game.mouse.y);
  if (!placement || game.gameOver) {
    return;
  }

  const previewType = game.mobileUi && cast.active ? cast.type : game.selectedType;
  const config = defenderTypes[previewType];
  const previewFeetY = placement.y + 38;
  const canAfford = game.mobileUi && cast.active ? game.essence >= defenderTypes[cast.type].cost : canAffordSelectedDefender();
  const ghostTint = canAfford ? null : "rgba(255, 84, 84, 0.78)";
  const ghostBounds = {
    x: placement.x - 38,
    y: previewFeetY - 76,
    width: 76,
    height: 76,
  };
  const summon = game.summon;
  const instantPlacement = isPrepPhase();
  const progress =
    game.mobileUi && cast.active
      ? clamp(cast.charge / summon.holdDuration, 0, 1)
      : !instantPlacement && summon.placement && placementsMatch(summon.placement, placement)
        ? clamp(summon.charge / summon.holdDuration, 0, 1)
        : 0;
  const isWaveCast = !instantPlacement && progress > 0;
  ctx.save();
  let drewSprite = false;
  if (isWaveCast && staticSpriteReady(previewType)) {
    const sprite = staticSprites[previewType];
    const revealHeight = Math.max(1, Math.floor(ghostBounds.height * progress));
    const revealY = ghostBounds.y + ghostBounds.height - revealHeight;
    const sourceY = sprite.naturalHeight * (1 - revealHeight / ghostBounds.height);
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = ghostBounds.width;
    tempCanvas.height = ghostBounds.height;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.imageSmoothingEnabled = false;
    tempCtx.globalAlpha = 0.2 + progress * 0.8;
    tempCtx.drawImage(
      sprite,
      0,
      sourceY,
      sprite.naturalWidth,
      sprite.naturalHeight - sourceY,
      0,
      ghostBounds.height - revealHeight,
      ghostBounds.width,
      revealHeight,
    );
    if (ghostTint) {
      tempCtx.globalCompositeOperation = "source-atop";
      tempCtx.fillStyle = ghostTint;
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.globalCompositeOperation = "source-over";
    }
    ctx.drawImage(tempCanvas, ghostBounds.x, ghostBounds.y, ghostBounds.width, ghostBounds.height);
    drewSprite = true;
  } else {
    drewSprite = ghostTint
      ? drawTintedStaticSprite(
          previewType,
          ghostBounds.x,
          ghostBounds.y,
          ghostBounds.width,
          ghostBounds.height,
          ghostTint,
          0.52,
        )
      : drawStaticSprite(previewType, ghostBounds.x, ghostBounds.y, ghostBounds.width, ghostBounds.height, {
          alpha: 0.4,
        });
  }
  if (!drewSprite) {
    ctx.globalAlpha = isWaveCast ? 0.2 + progress * 0.8 : canAfford ? 0.4 : 0.55;
    ctx.fillStyle = canAfford ? config.color : "#ff6b6b";
    const revealHeight = isWaveCast ? Math.max(4, 38 * progress) : 38;
    ctx.fillRect(placement.x - 12, placement.y + (38 - revealHeight), 24, revealHeight);
  }

  ctx.globalAlpha = 1;
  if (!isWaveCast) {
    drawCastRing(placement.x, placement.y - 18, progress, {
      radius: 16,
      lineWidth: 4,
      trackColor: !canAfford
        ? "rgba(255, 116, 116, 0.8)"
        : instantPlacement
          ? "rgba(146, 255, 211, 0.6)"
          : "rgba(230, 244, 255, 0.45)",
      fillColor: !canAfford ? "#ff8c8c" : "#f7c96a",
    });
  }

  ctx.restore();
}

function drawOverlay() {
  if (game.mobileUi) {
    return;
  }

  ctx.fillStyle = "rgba(10, 16, 24, 0.62)";
  ctx.fillRect(18, 16, 366, 100);
  ctx.fillStyle = "#edf5ff";
  ctx.font = '20px "Palatino Linotype", Georgia, serif';
  ctx.fillText("Skyhold Rampart", 34, 42);
  ctx.font = '14px "Avenir Next", "Segoe UI", sans-serif';
  ctx.fillStyle = "#9fc7de";
  if (game.mobileUi && isPrepPhase()) {
    ctx.fillText("Use the left pad to move and the right buttons to fight.", 34, 68);
    ctx.fillText("Placement is off on mobile for now. Tap ? for the full panel.", 34, 92);
  } else if (game.mobileUi) {
    ctx.fillText("Use the left pad to move and the right buttons to jump or attack.", 34, 68);
    ctx.fillText("Placement is off on mobile for now. Tap ? for the full panel.", 34, 92);
  } else if (isPrepPhase()) {
    ctx.fillText(`Preparation window: place defenders instantly before the wave breaks.`, 34, 68);
    ctx.fillText(`F places now. Tab toggles placement. Tap R revives one. Hold R revives the line.`, 34, 92);
  } else {
    ctx.fillText(`Survive until round ${game.totalWaves} and keep the core alive.`, 34, 68);
    ctx.fillText(`Mouse 1 strikes, Mouse 2 casts, Tab toggles placement, hold F 2s to place.`, 34, 92);
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

function drawPauseOverlay() {
  if (!isPaused()) {
    return;
  }

  const readyMode = game.pauseMode === "ready";
  const pulse = 1 + Math.sin(game.time * 3.2) * 0.02;
  const boxWidth = readyMode ? 420 : 380;
  const boxHeight = readyMode ? 176 : 210;
  const boxX = WIDTH / 2 - boxWidth / 2;
  const boxY = HEIGHT / 2 - boxHeight / 2;

  ctx.save();
  ctx.fillStyle = "rgba(4, 8, 14, 0.64)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.translate(WIDTH / 2, HEIGHT / 2);
  ctx.scale(pulse, pulse);
  ctx.translate(-WIDTH / 2, -HEIGHT / 2);

  const panel = ctx.createLinearGradient(0, boxY, 0, boxY + boxHeight);
  panel.addColorStop(0, readyMode ? "rgba(30, 53, 82, 0.96)" : "rgba(44, 24, 16, 0.95)");
  panel.addColorStop(1, readyMode ? "rgba(8, 15, 24, 0.95)" : "rgba(11, 8, 14, 0.95)");
  ctx.fillStyle = panel;
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

  ctx.strokeStyle = readyMode ? "rgba(164, 218, 255, 0.9)" : "rgba(255, 207, 136, 0.9)";
  ctx.lineWidth = 3;
  ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

  ctx.textAlign = "center";
  ctx.fillStyle = "#f4fbff";
  ctx.font = readyMode ? '42px "Palatino Linotype", Georgia, serif' : '36px "Palatino Linotype", Georgia, serif';
  ctx.fillText(readyMode ? "Ready?" : "Paused", WIDTH / 2, boxY + 62);

  ctx.font = '22px "Avenir Next", "Segoe UI", sans-serif';
  ctx.fillStyle = readyMode ? "#d7ebff" : "#ffdcb8";
  ctx.fillText(readyMode ? "Start moving to begin." : "Esc to resume", WIDTH / 2, boxY + 104);

  ctx.font = '16px "Avenir Next", "Segoe UI", sans-serif';
  ctx.fillStyle = "#bdd4e4";
  if (readyMode) {
    ctx.fillText(
      game.mobileUi ? "Move with the left pad to begin. Tap ? for controls." : "A / D / W / Space will drop you straight into the fight",
      WIDTH / 2,
      boxY + 138,
    );
  } else {
    ctx.fillText("Controls", WIDTH / 2, boxY + 136);
    ctx.fillText(
      game.mobileUi ? "Move: left pad    Jump / Strike / Bolt: right buttons" : "Move: A / D / W / Space",
      WIDTH / 2,
      boxY + 160,
    );
    ctx.fillText(game.mobileUi ? "Tap ? for the full info panel" : "Attack: Mouse 1    Magic: Mouse 2", WIDTH / 2, boxY + 184);
  }

  ctx.textAlign = "left";
  ctx.restore();
}

function drawPrepCountdown() {
  if (!isPrepPhase() || game.gameOver || isPaused()) {
    return;
  }

  const secondsLeft = Math.ceil(game.prepTimer);
  const urgent = secondsLeft <= 5;
  const critical = secondsLeft <= 3;
  const mobile = game.mobileUi;
  const viewportInsets = mobile ? getCanvasViewportInsets() : { insetY: 0 };
  const pulse = 1 + Math.sin(game.time * (critical ? 12 : urgent ? 8 : 4)) * (critical ? 0.08 : 0.04);
  const bannerWidth = mobile ? (critical ? 214 : 188) : critical ? 340 : 290;
  const bannerHeight = mobile ? (critical ? 84 : 74) : critical ? 126 : 102;
  const x = WIDTH / 2 - bannerWidth / 2;
  const y = mobile ? Math.max(viewportInsets.insetY + 72, 88) : 22;

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
  ctx.font = mobile ? '13px "Avenir Next", "Segoe UI", sans-serif' : '16px "Avenir Next", "Segoe UI", sans-serif';
  ctx.fillText(critical ? "BATTLE SURGES IN" : "PREPARE THE RAMPART", WIDTH / 2, y + (mobile ? 22 : 28));

  ctx.font = mobile
    ? critical
      ? '42px "Palatino Linotype", Georgia, serif'
      : '36px "Palatino Linotype", Georgia, serif'
    : critical
      ? '58px "Palatino Linotype", Georgia, serif'
      : '50px "Palatino Linotype", Georgia, serif';
  ctx.fillStyle = critical ? "#fff2d7" : urgent ? "#ffe6bf" : "#f8fbff";
  ctx.fillText(`${secondsLeft}`, WIDTH / 2, y + (mobile ? 62 : 82));

  const fallenDefenders = getFallenDefenders();
  const totalReviveCost = getMassReviveCost();
  const reviveProgress = clamp(game.reviveAll.charge / game.reviveAll.holdDuration, 0, 1);
  const calloutY = y + bannerHeight + (mobile ? 12 : 22);

  if (!critical && !game.mobileUi) {
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
  drawCoreHealthBar();
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
  drawPauseOverlay();
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
  interruptSummonCast();
  if (game.hero.onGround && !game.gameOver) {
    game.hero.vy = -game.hero.jumpStrength;
    game.hero.jumpBoostTimer = game.hero.jumpBoostDuration;
    game.hero.jumpHangTimer = game.hero.jumpHangDuration;
    game.hero.jumpStartupFrame = 0;
    game.hero.jumpStartupTimer = 0;
    game.hero.jumpLandingActive = false;
    game.hero.jumpLandingFrame = 0;
    game.hero.jumpLandingTimer = 0;
    game.hero.onGround = false;
  }
}

function startGameFromMovement() {
  requestLandscapeLock();
  if (game.pauseMode === "ready") {
    setPaused(false);
  }
}

function bindHoldButton(element, onPress, onRelease) {
  if (!element) {
    return;
  }

  let activePointerId = null;

  const release = (event) => {
    if (activePointerId === null) {
      return;
    }
    if (event?.pointerId !== undefined && event.pointerId !== activePointerId) {
      return;
    }
    activePointerId = null;
    element.classList.remove("is-active");
    onRelease?.(event);
  };

  element.addEventListener("pointerdown", (event) => {
    if (!game.mobileUi) {
      return;
    }
    event.preventDefault();
    requestLandscapeLock();
    activePointerId = event.pointerId;
    element.classList.add("is-active");
    element.setPointerCapture?.(event.pointerId);
    onPress?.(event);
  });

  element.addEventListener("pointerup", release);
  element.addEventListener("pointercancel", release);
  element.addEventListener("pointerleave", (event) => {
    if (event.pointerType !== "mouse") {
      release(event);
    }
  });
}

function bindTapButton(element, action) {
  bindHoldButton(
    element,
    (event) => {
      action(event);
    },
    () => {},
  );
}

document.addEventListener("keydown", (event) => {
  if (event.code === "Escape" && game.infoModalOpen) {
    event.preventDefault();
    closeInfoModal();
    return;
  }

  if (event.code === "Escape" && !game.gameOver) {
    event.preventDefault();
    if (game.pauseMode === "ready") {
      setPaused(false);
    } else {
      setPaused(!game.paused, game.paused ? null : "menu");
    }
    return;
  }

  if (
    game.pauseMode === "ready" &&
    (event.code === "KeyA" || event.code === "KeyD" || event.code === "KeyW" || event.code === "Space")
  ) {
    setPaused(false);
  }

  if (event.code === "Tab" && !game.gameOver) {
    event.preventDefault();
    setPlacementMode(!game.summon.modeEnabled, true);
    return;
  }

  game.keys[event.code] = true;
  game.keys[event.key] = true;

  if (isPaused()) {
    return;
  }

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

  if (isPaused()) {
    return;
  }

  if (event.code === "KeyF") {
    resetSummonState(true);
  }
  if (event.key === "f" || event.key === "F") {
    resetSummonState(true);
  }
  if (event.code === "KeyR" || event.key === "r" || event.key === "R") {
    finishReviveInput();
  }
});

canvas.addEventListener("mousemove", (event) => {
  setMouseFromClient(event.clientX, event.clientY);
});

canvas.addEventListener("mousedown", (event) => {
  if (isPaused()) {
    return;
  }

  setMouseFromClient(event.clientX, event.clientY);

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

ui.infoToggle.addEventListener("click", () => {
  if (game.infoModalOpen) {
    closeInfoModal();
  } else {
    openInfoModal();
  }
});

ui.infoClose.addEventListener("click", () => {
  closeInfoModal();
});

if (ui.mobileGuideClose) {
  ui.mobileGuideClose.addEventListener("click", () => {
    closeInfoModal();
  });
}

ui.infoBackdrop.addEventListener("click", () => {
  closeInfoModal();
});

function handleBuildToggle(event) {
  if (!game.mobileUi) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  requestLandscapeLock();
  setPlacementMode(!game.summon.modeEnabled, true);
}

ui.buildToggle.addEventListener("pointerdown", (event) => {
  if (!game.mobileUi) {
    return;
  }
  handleBuildToggle(event);
});

for (const button of ui.buildUnitButtons) {
  button.addEventListener("click", (event) => {
    if (!game.mobileUi) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setSelectedType(button.dataset.type);
    setPlacementMode(true);
  });
}

ui.joystickZone.addEventListener("pointerdown", (event) => {
  if (!game.mobileUi || game.orientationBlocked) {
    return;
  }
  event.preventDefault();
  requestLandscapeLock();
  startGameFromMovement();
  game.mobileStick.active = true;
  game.mobileStick.pointerId = event.pointerId;
  ui.joystickZone.setPointerCapture?.(event.pointerId);
  updateMobileStick(event.clientX, event.clientY);
});

ui.joystickZone.addEventListener("pointermove", (event) => {
  if (!game.mobileUi || !game.mobileStick.active || event.pointerId !== game.mobileStick.pointerId) {
    return;
  }
  event.preventDefault();
  updateMobileStick(event.clientX, event.clientY);
});

function releaseJoystick(event) {
  if (!game.mobileStick.active) {
    return;
  }
  if (event?.pointerId !== undefined && event.pointerId !== game.mobileStick.pointerId) {
    return;
  }
  resetMobileStick();
}

window.addEventListener("pointermove", (event) => {
  if (!game.mobileUi || !game.mobileStick.active || event.pointerId !== game.mobileStick.pointerId) {
    return;
  }
  event.preventDefault?.();
  updateMobileStick(event.clientX, event.clientY);
});

window.addEventListener("pointerup", releaseJoystick);
window.addEventListener("pointercancel", releaseJoystick);

ui.gameStage.addEventListener("pointerdown", (event) => {
  if (!game.mobileUi || game.orientationBlocked || isPaused() || game.gameOver || !game.summon.modeEnabled) {
    return;
  }
  if (
    event.target.closest(
      ".mobile-controls, .status-strip, .mobile-build-toggle, .mobile-build-menu, .mobile-cancel-placement, .info-toggle, .game-wave-badge",
    )
  ) {
    return;
  }
  event.preventDefault();
  requestLandscapeLock();
  game.mobilePlacement.active = true;
  game.mobilePlacement.pointerId = event.pointerId;
  game.mobilePlacement.cancelHover = false;
  setMouseFromClient(event.clientX, event.clientY);
  ui.gameStage.setPointerCapture?.(event.pointerId);
  updateMobileBuildUi();
});

ui.gameStage.addEventListener("pointermove", (event) => {
  if (!game.mobileUi || !game.mobilePlacement.active || event.pointerId !== game.mobilePlacement.pointerId) {
    return;
  }
  event.preventDefault();
  setMouseFromClient(event.clientX, event.clientY);
  game.mobilePlacement.cancelHover = clientPointInside(ui.cancelPlacementBtn, event.clientX, event.clientY);
  updateMobileBuildUi();
});

function releaseMobilePlacement(event) {
  if (!game.mobilePlacement.active) {
    return;
  }
  if (event?.pointerId !== undefined && event.pointerId !== game.mobilePlacement.pointerId) {
    return;
  }

  const hasPointerPosition = typeof event?.clientX === "number" && typeof event?.clientY === "number";
  const releasedOverCancel = hasPointerPosition && clientPointInside(ui.cancelPlacementBtn, event.clientX, event.clientY);
  if (hasPointerPosition && !releasedOverCancel) {
    setMouseFromClient(event.clientX, event.clientY);
    if (isPrepPhase()) {
      placeDefender(game.mouse.x, game.mouse.y);
    } else {
      beginMobileSummonCast(game.mouse.x, game.mouse.y);
    }
  }
  resetMobilePlacement();
}

window.addEventListener("pointermove", (event) => {
  if (!game.mobileUi || !game.mobilePlacement.active || event.pointerId !== game.mobilePlacement.pointerId) {
    return;
  }
  event.preventDefault?.();
  setMouseFromClient(event.clientX, event.clientY);
  game.mobilePlacement.cancelHover = clientPointInside(ui.cancelPlacementBtn, event.clientX, event.clientY);
  updateMobileBuildUi();
});

window.addEventListener("pointerup", releaseMobilePlacement);
window.addEventListener("pointercancel", releaseMobilePlacement);

bindTapButton(ui.jumpBtn, () => {
  if (isPaused()) {
    return;
  }
  onJump();
});

bindHoldButton(
  ui.reviveBtn,
  () => {
    if (isPaused()) {
      return;
    }
    game.keys.KeyR = true;
    game.keys.r = true;
  },
  () => {
    game.keys.KeyR = false;
    game.keys.r = false;
    if (isPaused()) {
      return;
    }
    finishReviveInput();
  },
);

bindTapButton(ui.attackBtn, () => {
  if (isPaused()) {
    return;
  }
  performHeroStrike();
});

bindTapButton(ui.magicBtn, () => {
  if (isPaused()) {
    return;
  }
  castHeroBolt();
});

for (const button of ui.buttons) {
  button.addEventListener("click", () => setSelectedType(button.dataset.type));
}

window.addEventListener("resize", () => {
  updateMobileUiState();
});

window.addEventListener("blur", () => {
  clearMobileMovement();
  resetMobilePlacement();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearMobileMovement();
    resetMobilePlacement();
  }
});

document.addEventListener(
  "touchmove",
  (event) => {
    if (game.mobileUi && !game.infoModalOpen) {
      event.preventDefault();
    }
  },
  { passive: false },
);

document.addEventListener(
  "gesturestart",
  (event) => {
    if (game.mobileUi) {
      event.preventDefault();
    }
  },
  { passive: false },
);

game.hero = createHero();
setSelectedType("warrior");
syncPauseStateClass();
updateMobileUiState(true);
updateUi();
requestAnimationFrame(frame);
