import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [level, setLevel] = useState(1);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [gameVictory, setGameVictory] = useState(false);
  
  const [pos, setPos] = useState(window.innerWidth / 2 - 50);
  const [hp, setHp] = useState(100);
  const [stamina, setStamina] = useState(100);
  const [score, setScore] = useState(0);
  const [shurikens, setShurikens] = useState([]); 
  const [enemyShurikens, setEnemyShurikens] = useState([]); 
  const [facing, setFacing] = useState(1);
  const [posY, setPosY] = useState(0); 
  const [isJumping, setIsJumping] = useState(false);
  const [velY, setVelY] = useState(0);

  const [idleFrame, setIdleFrame] = useState(1);
  const [jumpFrame, setJumpFrame] = useState(1);
  const [runFrame, setRunFrame] = useState(1);

  // Estados do Boss
  const [boss, setBoss] = useState(null);

  const keysPressed = useRef({});
  const posRef = useRef(pos);
  const posYRef = useRef(posY);
  const facingRef = useRef(facing);

  const GRAVITY = 1.8;
  const JUMP_FORCE = 25;

  useEffect(() => {
    posRef.current = pos;
    posYRef.current = posY;
    facingRef.current = facing;
  }, [pos, posY, facing]);

  const generateEnemies = (lvl) => {
    if (lvl === 3) return []; // Nível 3 não tem minions comuns inicialmente

    const isLevel1 = lvl === 1;
    const countPerSide = isLevel1 ? 10 : 7; 
    const totalShooters = lvl === 2 ? 7 : 0; 
    let allEnemies = [];

    [1, -1].forEach((sideDir) => {
      for (let i = 0; i < countPerSide; i++) {
        const spawnDistance = isLevel1 ? 700 : 450; 
        allEnemies.push({
          id: `minion-${lvl}-${sideDir}-${i}`,
          x: sideDir === 1 ? -200 - (i * spawnDistance) : window.innerWidth + 200 + (i * spawnDistance),
          hp: 100,
          dir: sideDir, 
          speed: (2 + Math.random() * 1.5) + (lvl * 0.3),
          canShoot: false,
          lastShot: Date.now() + (Math.random() * 1000) 
        });
      }
    });

    if (totalShooters > 0) {
      const shuffled = [...allEnemies].sort(() => 0.5 - Math.random());
      const shooterIds = shuffled.slice(0, totalShooters).map(e => e.id);
      allEnemies = allEnemies.map(e => ({ ...e, canShoot: shooterIds.includes(e.id) }));
    }
    return allEnemies;
  };

  const [enemies, setEnemies] = useState(() => generateEnemies(1));

  // Inicializa o Boss se for Nível 3
  useEffect(() => {
    if (level === 3 && gameStarted) {
      setBoss({
        hp: 1000, // Boss tem 10x mais vida
        maxHp: 1000,
        x: window.innerWidth - 300,
        y: 0,
        dir: -1,
        speed: 3,
        lastShot: Date.now(),
        attackMode: 'normal'
      });
    }
  }, [level, gameStarted]);

  useEffect(() => {
    const aliveEnemies = enemies.filter(e => e.hp > 0).length;
    if (gameStarted && level < 3 && aliveEnemies === 0 && !showLevelUp) {
      setShowLevelUp(true);
    }
    // Vitória no Boss
    if (level === 3 && boss && boss.hp <= 0 && !gameVictory) {
      setGameVictory(true);
    }
  }, [enemies, boss, gameStarted, level, showLevelUp, gameVictory]);

  const nextLevel = () => {
    const nextLvl = level + 1;
    setLevel(nextLvl);
    setEnemies(generateEnemies(nextLvl));
    setHp(100);
    setStamina(100);
    setShurikens([]);
    setEnemyShurikens([]);
    setShowLevelUp(false);
    setPos(window.innerWidth / 2 - 50);
  };

  // ANIMAÇÕES
  useEffect(() => {
    const anim = setInterval(() => setIdleFrame(prev => (prev === 1 ? 2 : 1)), 500);
    return () => clearInterval(anim);
  }, []);

  useEffect(() => {
    let jumpAnim;
    if (isJumping) {
      setJumpFrame(1);
      jumpAnim = setInterval(() => setJumpFrame(prev => (prev < 12 ? prev + 1 : 12)), 60);
    }
    return () => clearInterval(jumpAnim);
  }, [isJumping]);

  useEffect(() => {
    let runAnim;
    if (!isJumping && gameStarted) {
      runAnim = setInterval(() => {
        const moving = keysPressed.current["ArrowRight"] || keysPressed.current["ArrowLeft"];
        if (moving) setRunFrame(prev => (prev < 4 ? prev + 1 : 1));
        else setRunFrame(1);
      }, 100);
    }
    return () => clearInterval(runAnim);
  }, [isJumping, gameStarted]);

  // FÍSICA E REGEN
  useEffect(() => {
    if (!gameStarted || hp <= 0 || showLevelUp || gameVictory) return;
    const reg = setInterval(() => setStamina(s => Math.min(s + 4, 100)), 250);
    const physics = setInterval(() => {
      setPosY(y => {
        if (y > 0 || velY !== 0) {
          let nextY = y + velY;
          setVelY(v => v - GRAVITY);
          if (nextY <= 0) { setVelY(0); setIsJumping(false); return 0; }
          return nextY;
        }
        return 0;
      });
    }, 30);
    return () => { clearInterval(reg); clearInterval(physics); };
  }, [gameStarted, hp, velY, showLevelUp, gameVictory]);

  // INPUTS
  const handleKeyDown = useCallback((e) => {
    keysPressed.current[e.key] = true;
    if (!gameStarted || hp <= 0 || showLevelUp || gameVictory) return;
    if ((e.key === "ArrowUp" || e.code === "Space") && !isJumping) {
      setIsJumping(true); setVelY(JUMP_FORCE);
    }
    if (e.key.toLowerCase() === "f" && stamina >= 25) {
      const startX = facingRef.current === 1 ? posRef.current + 60 : posRef.current - 20;
      setShurikens(prev => [...prev, { id: Date.now(), x: startX, y: posYRef.current + 14, dir: facingRef.current }]);
      setStamina(s => Math.max(s - 25, 0));
    }
  }, [gameStarted, hp, isJumping, stamina, showLevelUp, gameVictory]);

  const handleKeyUp = useCallback((e) => { keysPressed.current[e.key] = false; }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => { window.removeEventListener("keydown", handleKeyDown); window.removeEventListener("keyup", handleKeyUp); };
  }, [handleKeyDown, handleKeyUp]);

  // ENGINE PRINCIPAL
  useEffect(() => {
    if (!gameStarted || showLevelUp || gameVictory) return;
    const engine = setInterval(() => {
      // Movimento Player
      setPos(p => {
        let newPos = p;
        if (keysPressed.current["ArrowRight"]) { newPos = Math.min(p + 8, window.innerWidth - 110); setFacing(1); }
        if (keysPressed.current["ArrowLeft"]) { newPos = Math.max(p - 8, 0); setFacing(-1); }
        return newPos;
      });

      let hitShurikenIds = [];
      let newEnemyShurikens = [];

      // Lógica do Boss (Nível 3)
      if (level === 3 && boss) {
        setBoss(prevBoss => {
          if (prevBoss.hp <= 0) return prevBoss;

          let newX = prevBoss.x + (prevBoss.dir * prevBoss.speed);
          let newDir = prevBoss.dir;
          if (newX > window.innerWidth - 150) newDir = -1;
          if (newX < 100) newDir = 1;

          // Ataque do Boss (Muito mais rápido)
          if (Date.now() - prevBoss.lastShot > 600) {
            newEnemyShurikens.push({
              id: `boss-shur-${Date.now()}`,
              x: newX + 50,
              y: 40,
              dir: posRef.current > newX ? 1 : -1 // Atira na direção do player
            });
            prevBoss.lastShot = Date.now();
          }

          // Colisão Shuriken Player -> Boss
          const hitByPlayer = shurikens.find(s => 
            s.x > newX && s.x < newX + 150 && (90 + s.y) > 50
          );
          let newHp = prevBoss.hp;
          if (hitByPlayer) {
            hitShurikenIds.push(hitByPlayer.id);
            newHp -= 20; // Player tira 20 de vida ao Boss por shuriken
          }

          return { ...prevBoss, x: newX, dir: newDir, hp: newHp, lastShot: prevBoss.lastShot };
        });
      }

      // Minions comuns
      setEnemies(prevEnemies => {
        return prevEnemies.map(enemy => {
          if (enemy.hp <= 0) return enemy;
          if (enemy.canShoot && Date.now() - enemy.lastShot > 800) {
            newEnemyShurikens.push({ id: `es-${Date.now()}-${enemy.id}`, x: enemy.x, y: 20, dir: enemy.dir });
            enemy.lastShot = Date.now();
          }
          const coll = shurikens.find(s => s.x > enemy.x - 20 && s.x < enemy.x + 50);
          let nHp = enemy.hp;
          if (coll) { hitShurikenIds.push(coll.id); nHp -= 34; }
          let nX = enemy.x + (enemy.dir * enemy.speed);
          return { ...enemy, x: nX, hp: nHp };
        });
      });

      // Shurikens do Player
      setShurikens(prev => 
        prev.filter(s => !hitShurikenIds.includes(s.id))
            .map(s => ({ ...s, x: s.x + (25 * s.dir) }))
            .filter(s => s.x > -100 && s.x < window.innerWidth + 100)
      );

      // Shurikens Inimigas
      setEnemyShurikens(prev => {
        const moved = [...prev, ...newEnemyShurikens].map(s => ({ ...s, x: s.x + (15 * s.dir) }));
        return moved.filter(s => {
          const hitPlayer = Math.abs(s.x - (posRef.current + 40)) < 40 && posYRef.current < 80;
          if (hitPlayer) { setHp(h => Math.max(h - 8, 0)); return false; }
          return s.x > -100 && s.x < window.innerWidth + 100;
        });
      });

    }, 1000 / 60);
    return () => clearInterval(engine);
  }, [shurikens, enemyShurikens, gameStarted, showLevelUp, level, boss, gameVictory]);

  return (
    <div className="game-container">
      {!gameStarted ? (
        <div className="start-menu">
          <h1 className="title-glow">BREAKOUT</h1>
          <button className="btn-start" onClick={() => setGameStarted(true)}>INICIAR FUGA</button>
        </div>
      ) : (
        <>
          <div className="hud">
            <div>NÍVEL: {level}</div>
            <div className="hud-center">SCORE: {score}</div>
            <div>{level === 3 ? "BOSS FIGHT" : `INIMIGOS: ${enemies.filter(e => e.hp > 0).length}`}</div>
          </div>

          {/* Barra de Vida do Boss */}
          {level === 3 && boss && (
            <div className="boss-hud">
              <div className="boss-name">MESTRE DAS SOMBRAS</div>
              <div className="boss-hp-outer"><div className="boss-hp-fill" style={{ width: `${(boss.hp / boss.maxHp) * 100}%` }}></div></div>
            </div>
          )}

          <div className="stats-container">
            <div><div className="bar-label">VIDA</div><div className="life-bar-outer"><div className="life-bar-fill" style={{ width: `${hp}%` }}></div></div></div>
            <div><div className="bar-label">STAMINA</div><div className="stamina-bar-outer"><div className="stamina-bar-fill" style={{ width: `${stamina}%` }}></div></div></div>
          </div>

          <div className={`bashira ${isJumping ? `jump-frame-${jumpFrame}` : (keysPressed.current["ArrowRight"] || keysPressed.current["ArrowLeft"]) ? `run-frame-${runFrame}` : `frame-${idleFrame}`}`} 
               style={{ left: `${pos}px`, bottom: `${50 + posY}px`, transform: `scaleX(${facing})` }}>
          </div>
          
          {/* Render Boss */}
          {level === 3 && boss && boss.hp > 0 && (
            <div className="boss-sprite" style={{ left: `${boss.x}px`, bottom: '50px' }}>
              <div className="boss-visual"></div>
            </div>
          )}

          {enemies.map(enemy => (
            enemy.hp > 0 && (
              <div key={enemy.id} className="enemy" style={{ left: `${enemy.x}px`, bottom: '80px' }}>
                 <div className="enemy-hp-min"><div style={{ background: 'red', height: '100%', width: `${enemy.hp}%` }}></div></div>
                 <div className={`enemy-body ${enemy.canShoot ? 'shooter' : ''}`}></div>
              </div>
            )
          ))}

          {shurikens.map(s => <div key={s.id} className="shuriken" style={{ left: `${s.x}px`, bottom: `${90 + s.y}px` }}></div>)}
          {enemyShurikens.map(s => <div key={s.id} className="shuriken enemy-shuriken" style={{ left: `${s.x}px`, bottom: `${90 + s.y}px`, filter: 'hue-rotate(150deg)' }}></div>)}

          {showLevelUp && (
            <div className="overlay level-up">
              <h1>NÍVEL CONCLUÍDO!</h1>
              <button className="btn-start" onClick={nextLevel}>IR PARA NÍVEL {level + 1}</button>
            </div>
          )}

          {gameVictory && (
            <div className="overlay victory">
              <h1 className="title-glow">LIBERDADE!</h1>
              <p>O Mestre das Sombras foi derrotado.</p>
              <button className="btn-retry" onClick={() => window.location.reload()}>JOGAR NOVAMENTE</button>
            </div>
          )}

          {hp <= 0 && (
            <div className="overlay">
              <h1>BASHIRA DERROTADO</h1>
              <button className="btn-retry" onClick={() => window.location.reload()}>RECOMEÇAR</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;