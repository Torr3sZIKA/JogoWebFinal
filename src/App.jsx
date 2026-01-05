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

  const [boss, setBoss] = useState(null);

  // --- REFERÊNCIAS DE ÁUDIO ---
  const levelAudioRef = useRef(new Audio('/LevelMusic.mp3'));
  const bossAudioRef = useRef(new Audio('/BossMusic.mp3'));
  const defeatSoundRef = useRef(new Audio('/DefeatSound.wav'));
  const levelVictoryRef = useRef(new Audio('/LevelVictory.mp3'));
  const throwSoundRef = useRef(new Audio('/Throw.wav')); // Novo som de lançamento

  const keysPressed = useRef({});
  const posRef = useRef(pos);
  const posYRef = useRef(posY);
  const facingRef = useRef(facing);

  const GRAVITY = 1.8;
  const JUMP_FORCE = 25;

  // 1. LÓGICA DE MÚSICA DE FUNDO (Loop)
  useEffect(() => {
    const levelMusic = levelAudioRef.current;
    const bossMusic = bossAudioRef.current;
    levelMusic.loop = true;
    bossMusic.loop = true;

    if (gameStarted && hp > 0 && !gameVictory && !showLevelUp) {
      if (level === 3) {
        levelMusic.pause();
        bossMusic.play().catch(() => {});
      } else {
        bossMusic.pause();
        levelMusic.play().catch(() => {});
      }
    } else {
      levelMusic.pause();
      bossMusic.pause();
    }
    return () => { levelMusic.pause(); bossMusic.pause(); };
  }, [gameStarted, level, hp, gameVictory, showLevelUp]);

  // 2. LÓGICA DE EFEITOS SONOROS (Vitória e Derrota)
  useEffect(() => {
    if (showLevelUp || gameVictory) {
      levelVictoryRef.current.currentTime = 0;
      levelVictoryRef.current.play().catch(() => {});
    }
  }, [showLevelUp, gameVictory]);

  useEffect(() => {
    if (hp <= 0 && gameStarted) {
      defeatSoundRef.current.currentTime = 0;
      defeatSoundRef.current.play().catch(() => {});
    }
  }, [hp, gameStarted]);

  // --- LÓGICA DO JOGO ---

  useEffect(() => {
    posRef.current = pos;
    posYRef.current = posY;
    facingRef.current = facing;
  }, [pos, posY, facing]);

  const generateEnemies = (lvl) => {
    const isLevel1 = lvl === 1;
    const countPerSide = isLevel1 ? 10 : 7; 
    const totalShooters = lvl === 2 ? 7 : (lvl === 3 ? 4 : 0); 
    
    let allEnemies = [];
    [1, -1].forEach((sideDir) => {
      for (let i = 0; i < countPerSide; i++) {
        const spawnDistance = 450; 
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

  useEffect(() => {
    if (level === 3 && gameStarted) {
      setBoss({ hp: 1000, maxHp: 1000, x: window.innerWidth - 300, dir: -1, speed: 4, lastShot: Date.now() });
    } else {
      setBoss(null);
    }
  }, [level, gameStarted]);

  useEffect(() => {
    const aliveEnemies = enemies.filter(e => e.hp > 0).length;
    if (gameStarted && !showLevelUp && !gameVictory) {
      if (level < 3 && aliveEnemies === 0) setShowLevelUp(true);
      else if (level === 3 && boss && boss.hp <= 0) setGameVictory(true);
    }
  }, [enemies, boss, gameStarted, level, showLevelUp, gameVictory]);

  const nextLevel = () => {
    const nextLvl = level + 1;
    setLevel(nextLvl);
    setEnemies(generateEnemies(nextLvl));
    setHp(100); setStamina(100);
    setShurikens([]); setEnemyShurikens([]);
    setShowLevelUp(false);
    setPos(window.innerWidth / 2 - 50); setPosY(0);
  };

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
    if (!isJumping && gameStarted && !showLevelUp) {
      runAnim = setInterval(() => {
        const moving = keysPressed.current["ArrowRight"] || keysPressed.current["ArrowLeft"];
        if (moving) setRunFrame(prev => (prev < 4 ? prev + 1 : 1));
        else setRunFrame(1);
      }, 100);
    }
    return () => clearInterval(runAnim);
  }, [isJumping, gameStarted, showLevelUp]);

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

  const handleKeyDown = useCallback((e) => {
    keysPressed.current[e.key] = true;
    if (!gameStarted || hp <= 0 || showLevelUp || gameVictory) return;
    if ((e.key === "ArrowUp" || e.code === "Space") && !isJumping) {
      setIsJumping(true); setVelY(JUMP_FORCE);
    }
    
    // ATUALIZADO: Lógica de lançamento com som "Throw"
    if (e.key.toLowerCase() === "f" && stamina >= 25) {
      // Tocar som de lançamento
      throwSoundRef.current.currentTime = 0;
      throwSoundRef.current.play().catch(() => {});

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

  useEffect(() => {
    if (!gameStarted || showLevelUp || gameVictory) return;
    const engine = setInterval(() => {
      setPos(p => {
        let newPos = p;
        if (keysPressed.current["ArrowRight"]) { newPos = Math.min(p + 8, window.innerWidth - 110); setFacing(1); }
        if (keysPressed.current["ArrowLeft"]) { newPos = Math.max(p - 8, 0); setFacing(-1); }
        return newPos;
      });

      let hitShurikenIds = [];
      let newEnemyShurikens = [];

      if (level === 3 && boss) {
        setBoss(prev => {
          if (!prev || prev.hp <= 0) return prev;
          let nX = prev.x + (prev.dir * prev.speed);
          let nDir = prev.dir;
          if (nX > window.innerWidth - 160) nDir = -1;
          if (nX < 100) nDir = 1;
          if (Math.abs(nX - posRef.current) < 120 && posYRef.current < 150) setHp(h => Math.max(h - 1.5, 0));
          if (Date.now() - prev.lastShot > 800) {
            newEnemyShurikens.push({ id: `boss-s-${Date.now()}`, x: nX + 75, y: 50, dir: posRef.current > nX ? 1 : -1 });
            prev.lastShot = Date.now();
          }
          const hit = shurikens.find(s => s.x > nX && s.x < nX + 150);
          let nHp = prev.hp;
          if (hit) { hitShurikenIds.push(hit.id); nHp -= 20; }
          return { ...prev, x: nX, dir: nDir, hp: nHp };
        });
      }

      setEnemies(prev => prev.map(enemy => {
        if (enemy.hp <= 0) return enemy;
        let nX = enemy.x + (enemy.dir * enemy.speed);
        let nDir = enemy.dir;
        if (nX > window.innerWidth - 40) nDir = -1;
        if (nX < 0) nDir = 1;
        if (Math.abs(nX - posRef.current) < 55 && posYRef.current < 70) setHp(h => Math.max(h - 0.8, 0));
        if (enemy.canShoot && Date.now() - enemy.lastShot > 1100) {
          if (nX > -50 && nX < window.innerWidth + 50) {
            newEnemyShurikens.push({ id: `es-${Date.now()}-${enemy.id}`, x: nX, y: 20, dir: nDir });
            enemy.lastShot = Date.now();
          }
        }
        const coll = shurikens.find(s => s.x > nX - 20 && s.x < nX + 50);
        let nHp = enemy.hp;
        if (coll) { hitShurikenIds.push(coll.id); nHp -= 34; if (nHp <= 0) setScore(s => s + 100); }
        return { ...enemy, x: nX, dir: nDir, hp: nHp };
      }));

      setShurikens(prev => prev.filter(s => !hitShurikenIds.includes(s.id)).map(s => ({ ...s, x: s.x + (25 * s.dir) })).filter(s => s.x > -100 && s.x < window.innerWidth + 100));
      
      setEnemyShurikens(prev => {
        const moved = [...prev, ...newEnemyShurikens].map(s => ({ ...s, x: s.x + (14 * s.dir) }));
        return moved.filter(s => {
          const hitPlayer = Math.abs(s.x - (posRef.current + 40)) < 40 && (posYRef.current < 80);
          if (hitPlayer) { setHp(h => Math.max(h - 6, 0)); return false; }
          return s.x > -100 && s.x < window.innerWidth + 100;
        });
      });
    }, 1000 / 60);
    return () => clearInterval(engine);
  }, [gameStarted, showLevelUp, gameVictory, level, boss, shurikens]);

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
            <div className="hud-center">PONTOS: {score}</div>
            <div>{level === 3 ? "BOSS FIGHT" : `INIMIGOS: ${enemies.filter(e => e.hp > 0).length}`}</div>
          </div>

          {level === 3 && boss && boss.hp > 0 && (
            <div className="boss-hud">
              <div className="boss-name">MESTRE DAS SOMBRAS</div>
              <div className="boss-hp-outer">
                <div className="boss-hp-fill" style={{ width: `${(boss.hp / boss.maxHp) * 100}%` }}></div>
              </div>
            </div>
          )}

          <div className="stats-container">
            <div><div className="bar-label">VIDA</div><div className="life-bar-outer"><div className="life-bar-fill" style={{ width: `${hp}%` }}></div></div></div>
            <div><div className="bar-label">STAMINA</div><div className="stamina-bar-outer"><div className="stamina-bar-fill" style={{ width: `${stamina}%` }}></div></div></div>
          </div>

          <div className={`bashira ${isJumping ? `jump-frame-${jumpFrame}` : (keysPressed.current["ArrowRight"] || keysPressed.current["ArrowLeft"]) ? `run-frame-${runFrame}` : `frame-${idleFrame}`}`} 
               style={{ left: `${pos}px`, bottom: `${50 + posY}px`, transform: `scaleX(${facing})` }}>
          </div>

          {level === 3 && boss && boss.hp > 0 && (
            <div className="boss-sprite" style={{ 
                left: `${boss.x}px`, 
                bottom: '50px', 
                position: 'absolute',
                transform: `scaleX(${boss.dir * -1})`,
                zIndex: 10 
            }}>
                <div className="boss-body" style={{ 
                    width: '150px', height: '180px', background: '#1a1a1a', border: '4px solid #ff00ff', 
                    boxShadow: '0 0 30px #ff00ff', borderRadius: '10px'
                }}>
                    <div style={{ color: '#ff00ff', textAlign: 'center', marginTop: '70px', fontWeight: 'bold' }}>BOSS</div>
                </div>
            </div>
          )}

          {enemies.map(enemy => (
            enemy.hp > 0 && (
              <div key={enemy.id} style={{ left: `${enemy.x}px`, bottom: '80px', position: 'absolute', transform: `scaleX(${enemy.dir * -1})` }}>
                 <div style={{ background: '#333', width: '40px', height: '5px', marginBottom: '5px' }}>
                    <div style={{ background: 'red', height: '100%', width: `${enemy.hp}%` }}></div>
                 </div>
                 <div style={{ width: '40px', height: '60px', background: '#555', border: enemy.canShoot ? '2px solid #ff00ff' : '2px solid #000' }}></div>
              </div>
            )
          ))}

          {shurikens.map(s => <div key={s.id} className="shuriken" style={{ left: `${s.x}px`, bottom: `${90 + s.y}px` }}></div>)}
          {enemyShurikens.map(s => <div key={s.id} className="shuriken enemy-shuriken" style={{ left: `${s.x}px`, bottom: `${90 + s.y}px`, filter: 'hue-rotate(150deg) brightness(1.5)' }}></div>)}

          {showLevelUp && (
            <div className="overlay level-up">
              <h1>NÍVEL CONCLUÍDO!</h1>
              <button className="btn-start" onClick={nextLevel}>ENTRAR NO NÍVEL {level + 1}</button>
            </div>
          )}

          {gameVictory && (
            <div className="overlay victory">
              <h1 className="title-glow">LIBERDADE!</h1>
              <button className="btn-retry" onClick={() => window.location.reload()}>JOGAR NOVAMENTE</button>
            </div>
          )}

          {hp <= 0 && (
            <div className="overlay">
              <h1>DERROTADO</h1>
              <button className="btn-retry" onClick={() => window.location.reload()}>RECOMEÇAR</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;