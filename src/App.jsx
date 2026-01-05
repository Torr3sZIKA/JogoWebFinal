import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [level, setLevel] = useState(1);
  const [showLevelUp, setShowLevelUp] = useState(false);
  
  const [pos, setPos] = useState(window.innerWidth / 2 - 50);
  const [hp, setHp] = useState(100);
  const [stamina, setStamina] = useState(100);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const [shurikens, setShurikens] = useState([]); 
  const [enemyShurikens, setEnemyShurikens] = useState([]); 
  const [facing, setFacing] = useState(1);
  const [posY, setPosY] = useState(0); 
  const [isJumping, setIsJumping] = useState(false);
  const [velY, setVelY] = useState(0);

  const [idleFrame, setIdleFrame] = useState(1);
  const [jumpFrame, setJumpFrame] = useState(1);
  const [runFrame, setRunFrame] = useState(1);

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

  // GERADOR ATUALIZADO: Nível 1 com 20 inimigos e grande delay de spawn
  const generateEnemies = (lvl) => {
    const isLevel1 = lvl === 1;
    const countPerSide = isLevel1 ? 10 : 7; // 10 de cada lado no Nível 1 = 20 total
    const totalShooters = lvl >= 2 ? 7 : 0; // Só atiram a partir do Nível 2
    
    let allEnemies = [];

    [1, -1].forEach((sideDir) => {
      for (let i = 0; i < countPerSide; i++) {
        const sideName = sideDir === 1 ? 'left' : 'right';
        // Aumentei o multiplicador (i * 700) para criar maior intervalo de tempo entre eles
        const spawnDistance = isLevel1 ? 700 : 450; 
        
        allEnemies.push({
          id: `${sideName}-${lvl}-${i}`,
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
      allEnemies = allEnemies.map(e => ({
        ...e,
        canShoot: shooterIds.includes(e.id)
      }));
    }

    return allEnemies;
  };

  const [enemies, setEnemies] = useState(() => generateEnemies(1));

  useEffect(() => {
    const aliveEnemies = enemies.filter(e => e.hp > 0).length;
    if (gameStarted && aliveEnemies === 0 && !showLevelUp) {
      setShowLevelUp(true);
    }
  }, [enemies, gameStarted, showLevelUp]);

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
      jumpAnim = setInterval(() => {
        setJumpFrame(prev => (prev < 12 ? prev + 1 : 12));
      }, 60);
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

  // FÍSICA
  useEffect(() => {
    if (!gameStarted || hp <= 0 || showLevelUp) return;
    const t = setInterval(() => setTimer(prev => prev + 1), 1000);
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
    return () => { clearInterval(t); clearInterval(reg); clearInterval(physics); };
  }, [gameStarted, hp, velY, showLevelUp]);

  // INPUTS
  const handleKeyDown = useCallback((e) => {
    keysPressed.current[e.key] = true;
    if (!gameStarted || hp <= 0 || showLevelUp) return;
    if ((e.key === "ArrowUp" || e.code === "Space") && !isJumping) {
      setIsJumping(true); setVelY(JUMP_FORCE);
    }
    if (e.key.toLowerCase() === "f" && stamina >= 25) {
      const startX = facingRef.current === 1 ? posRef.current + 60 : posRef.current - 20;
      setShurikens(prev => [...prev, { id: Date.now(), x: startX, y: posYRef.current + 14, dir: facingRef.current }]);
      setStamina(s => Math.max(s - 25, 0));
    }
  }, [gameStarted, hp, isJumping, stamina, showLevelUp]);

  const handleKeyUp = useCallback((e) => { keysPressed.current[e.key] = false; }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => { window.removeEventListener("keydown", handleKeyDown); window.removeEventListener("keyup", handleKeyUp); };
  }, [handleKeyDown, handleKeyUp]);

  // ENGINE
  useEffect(() => {
    if (!gameStarted || showLevelUp) return;
    const engine = setInterval(() => {
      setPos(p => {
        let newPos = p;
        if (keysPressed.current["ArrowRight"]) { newPos = Math.min(p + 8, window.innerWidth - 110); setFacing(1); }
        if (keysPressed.current["ArrowLeft"]) { newPos = Math.max(p - 8, 0); setFacing(-1); }
        return newPos;
      });

      let hitShurikenIds = [];
      let newEnemyShurikens = [];

      setEnemies(prevEnemies => {
        return prevEnemies.map(enemy => {
          if (enemy.hp <= 0) return enemy;

          // Tiro Rápido (Só no Nv 2+)
          if (enemy.canShoot && Date.now() - enemy.lastShot > 800) {
            if (enemy.x > -50 && enemy.x < window.innerWidth + 50) {
              newEnemyShurikens.push({
                id: `eshur-${Date.now()}-${enemy.id}-${Math.random()}`,
                x: enemy.dir === 1 ? enemy.x + 40 : enemy.x - 10,
                y: 20,
                dir: enemy.dir
              });
              enemy.lastShot = Date.now();
            }
          }

          const collidingShuriken = shurikens.find(s => 
            s.x > enemy.x - 20 && s.x < enemy.x + 50 && Math.abs((90 + s.y) - 110) < 50
          );
          let newHp = enemy.hp;
          if (collidingShuriken) {
            hitShurikenIds.push(collidingShuriken.id);
            newHp -= 34;
            if (newHp <= 0) setScore(s => s + 100);
          }

          let newX = enemy.x + (enemy.dir * enemy.speed);
          let newDir = enemy.dir;
          if (newX > window.innerWidth - 60 && enemy.dir === 1) newDir = -1;
          if (newX < 0 && enemy.dir === -1) newDir = 1;

          if (Math.abs(newX - posRef.current) < 55 && posYRef.current < 70 && newHp > 0) {
            setHp(h => Math.max(h - 0.8, 0));
          }

          return { ...enemy, x: newX, hp: newHp, dir: newDir };
        });
      });

      setShurikens(prev => 
        prev.filter(s => !hitShurikenIds.includes(s.id))
            .map(s => ({ ...s, x: s.x + (25 * s.dir) }))
            .filter(s => s.x > -500 && s.x < window.innerWidth + 500)
      );

      setEnemyShurikens(prev => {
        const moved = [...prev, ...newEnemyShurikens].map(s => ({ ...s, x: s.x + (14 * s.dir) }));
        return moved.filter(s => {
          const hitPlayer = Math.abs(s.x - (posRef.current + 40)) < 40 && (posYRef.current < 80);
          if (hitPlayer) {
            setHp(h => Math.max(h - 5, 0)); 
            return false;
          }
          return s.x > -200 && s.x < window.innerWidth + 200;
        });
      });

    }, 1000 / 60);

    return () => clearInterval(engine);
  }, [shurikens, enemyShurikens, gameStarted, showLevelUp]);

  return (
    <div className="game-container">
      {!gameStarted ? (
        <div className="start-menu">
          <h1 className="title-glow">BREAKOUT</h1>
          <p className="subtitle">Shuriken of Bashira</p>
          <button className="btn-start" onClick={() => setGameStarted(true)}>INICIAR FUGA</button>
        </div>
      ) : (
        <>
          <div className="hud">
            <div>NÍVEL: {level}</div>
            <div className="hud-center">PONTOS: {score}</div>
            <div>INIMIGOS: {enemies.filter(e => e.hp > 0).length}</div>
          </div>

          <div className="stats-container">
            <div><div className="bar-label">VIDA</div><div className="life-bar-outer"><div className="life-bar-fill" style={{ width: `${hp}%` }}></div></div></div>
            <div><div className="bar-label">STAMINA</div><div className="stamina-bar-outer"><div className="stamina-bar-fill" style={{ width: `${stamina}%` }}></div></div></div>
          </div>

          <div className={`bashira ${isJumping ? `jump-frame-${jumpFrame}` : (keysPressed.current["ArrowRight"] || keysPressed.current["ArrowLeft"]) ? `run-frame-${runFrame}` : `frame-${idleFrame}`}`} 
               style={{ left: `${pos}px`, bottom: `${50 + posY}px`, transform: `scaleX(${facing})` }}>
          </div>
          
          {enemies.map(enemy => (
            enemy.hp > 0 && (
              <div key={enemy.id} style={{ left: `${enemy.x}px`, bottom: '80px', position: 'absolute', width: '40px' }}>
                 <div style={{ background: '#333', width: '40px', height: '5px', marginBottom: '5px' }}>
                    <div style={{ background: 'red', height: '100%', width: `${enemy.hp}%` }}></div>
                 </div>
                 <div style={{ 
                    width: '40px', height: '60px', background: '#555', 
                    border: enemy.canShoot ? '3px solid #ff00ff' : '2px solid #000',
                    boxShadow: enemy.canShoot ? '0 0 15px #ff00ff' : 'none'
                  }}></div>
              </div>
            )
          ))}

          {shurikens.map(s => (
            <div key={s.id} className="shuriken" style={{ left: `${s.x}px`, bottom: `${90 + s.y}px` }}></div>
          ))}

          {enemyShurikens.map(s => (
            <div key={s.id} className="shuriken enemy-shuriken" style={{ 
              left: `${s.x}px`, bottom: `${90 + s.y}px`, filter: 'hue-rotate(150deg) brightness(1.5)' 
            }}></div>
          ))}

          {showLevelUp && (
            <div className="overlay level-up">
              <h1 className="title-glow">ÁREA LIMPA!</h1>
              <button className="btn-start" onClick={nextLevel}>ENTRAR NO NÍVEL {level + 1}</button>
            </div>
          )}

          {hp <= 0 && (
            <div className="overlay">
              <h1>BASHIRA DERROTADO</h1>
              <button className="btn-retry" onClick={() => window.location.reload()}>TENTAR DE NOVO</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;