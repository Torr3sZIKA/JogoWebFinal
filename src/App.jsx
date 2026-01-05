import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  
  // BASHIRA NO CENTRO
  const [pos, setPos] = useState(window.innerWidth / 2 - 50);
  
  const [hp, setHp] = useState(100);
  const [stamina, setStamina] = useState(100);
  const [score, setScore] = useState(0);
  const [xp, setXp] = useState(0);
  const [timer, setTimer] = useState(0);
  const [shurikens, setShurikens] = useState([]);
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

  // NOVO: GERADOR DE 20 INIMIGOS (10 de cada lado)
  const [enemies, setEnemies] = useState(() => {
    const leftSide = Array.from({ length: 10 }, (_, i) => ({
      id: `left-${i}`,
      x: -200 - (i * 250), // Espaçados à esquerda
      hp: 100,
      dir: 1, 
      speed: 2 + Math.random() * 2
    }));

    const rightSide = Array.from({ length: 10 }, (_, i) => ({
      id: `right-${i}`,
      x: window.innerWidth + 200 + (i * 250), // Espaçados à direita
      hp: 100,
      dir: -1,
      speed: 2 + Math.random() * 2
    }));

    return [...leftSide, ...rightSide];
  });

  // Loop Animação Idle
  useEffect(() => {
    const anim = setInterval(() => setIdleFrame(prev => (prev === 1 ? 2 : 1)), 500);
    return () => clearInterval(anim);
  }, []);

  // Loop Animação Salto
  useEffect(() => {
    let jumpAnim;
    if (isJumping) {
      setJumpFrame(1);
      jumpAnim = setInterval(() => {
        setJumpFrame(prev => (prev < 12 ? prev + 1 : 12));
      }, 60);
    } else {
      setJumpFrame(1);
    }
    return () => clearInterval(jumpAnim);
  }, [isJumping]);

  // Loop Animação Corrida
  useEffect(() => {
    let runAnim;
    if (!isJumping && gameStarted) {
      runAnim = setInterval(() => {
        const moving = keysPressed.current["ArrowRight"] || keysPressed.current["ArrowLeft"];
        if (moving) {
          setRunFrame(prev => (prev < 4 ? prev + 1 : 1));
        } else {
          setRunFrame(1);
        }
      }, 100);
    }
    return () => clearInterval(runAnim);
  }, [isJumping, gameStarted]);

  // Engine de Física e Barras
  useEffect(() => {
    if (!gameStarted || hp <= 0) return;
    const t = setInterval(() => setTimer(prev => prev + 1), 1000);
    const reg = setInterval(() => setStamina(s => Math.min(s + 3, 100)), 200);
    
    const physics = setInterval(() => {
      setPosY(y => {
        if (y > 0 || velY !== 0) {
          let nextY = y + velY;
          setVelY(v => v - GRAVITY);
          if (nextY <= 0) {
            setVelY(0);
            setIsJumping(false);
            return 0;
          }
          return nextY;
        }
        return 0;
      });
    }, 30);

    return () => {
      clearInterval(t);
      clearInterval(reg);
      clearInterval(physics);
    };
  }, [gameStarted, hp, velY]);

  const handleKeyDown = useCallback((e) => {
    keysPressed.current[e.key] = true;
    if (!gameStarted || hp <= 0) return;

    if ((e.key === "ArrowUp" || e.code === "Space") && !isJumping) {
      setIsJumping(true);
      setVelY(JUMP_FORCE);
    }
    
    if (e.key.toLowerCase() === "f" && stamina >= 25) {
      const startX = facingRef.current === 1 ? posRef.current + 60 : posRef.current - 20;
      setShurikens(prev => [...prev, { id: Date.now(), x: startX, y: posYRef.current + 14, dir: facingRef.current }]);
      setStamina(s => s - 25);
    }
  }, [gameStarted, hp, isJumping, stamina]);

  const handleKeyUp = useCallback((e) => {
    keysPressed.current[e.key] = false;
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Engine Principal
  useEffect(() => {
    if (!gameStarted) return;
    const engine = setInterval(() => {
      // Movimento do Player
      setPos(p => {
        let newPos = p;
        if (keysPressed.current["ArrowRight"]) {
          newPos = Math.min(p + 8, window.innerWidth - 110);
          setFacing(1);
        }
        if (keysPressed.current["ArrowLeft"]) {
          newPos = Math.max(p - 8, 0);
          setFacing(-1);
        }
        return newPos;
      });

      let hitShurikenIds = [];
      setEnemies(prevEnemies => {
        return prevEnemies.map(enemy => {
          if (enemy.hp <= 0) return enemy;

          // Colisão Shuriken -> Inimigo
          const collidingShuriken = shurikens.find(s => 
            s.x > enemy.x - 20 && s.x < enemy.x + 50 &&
            Math.abs((90 + s.y) - 110) < 50
          );

          let newHp = enemy.hp;
          if (collidingShuriken) {
            hitShurikenIds.push(collidingShuriken.id);
            newHp -= 34; // 3 hits para matar
            if (newHp <= 0) {
              setScore(s => s + 100);
              setXp(x => x + 15);
            }
          }

          // Movimento do Inimigo
          let newX = enemy.x + (enemy.dir * (enemy.speed || 2.5));
          let newDir = enemy.dir;

          // Rebater nas bordas (apenas se já estiver dentro do ecrã)
          if (newX > window.innerWidth - 60 && enemy.dir === 1) newDir = -1;
          if (newX < 0 && enemy.dir === -1) newDir = 1;

          // Colisão Inimigo -> Bashira
          if (Math.abs(newX - posRef.current) < 55 && posYRef.current < 70 && newHp > 0) {
            setHp(h => Math.max(h - 0.8, 0)); // Dano contínuo ao tocar
          }

          return { ...enemy, x: newX, hp: newHp, dir: newDir };
        });
      });

      setShurikens(prev => 
        prev.filter(s => !hitShurikenIds.includes(s.id))
            .map(s => ({ ...s, x: s.x + (25 * s.dir) }))
            .filter(s => s.x > -500 && s.x < window.innerWidth + 500)
      );
    }, 1000 / 60);

    return () => clearInterval(engine);
  }, [shurikens, gameStarted]);

  return (
    <div className="game-container">
      {!gameStarted ? (
        <div className="start-menu">
          <h1 className="title-glow">BREAKOUT</h1>
          <p className="subtitle">Shuriken of Bashira</p>
          <div className="controls-box">
            <p>SETAS: Mover e Saltar</p>
            <p>F: Lançar o Shuriken</p>
          </div>
          <button className="btn-start" onClick={() => setGameStarted(true)}>
            INICIAR FUGA
          </button>
        </div>
      ) : (
        <>
          <div className="hud">
            <div>PONTUAÇÃO: {score}</div>
            <div className="hud-center">
                {Math.floor(timer / 60).toString().padStart(2, '0')}:
                {(timer % 60).toString().padStart(2, '0')}
            </div>
            <div>XP: {xp} | INIMIGOS: {enemies.filter(e => e.hp > 0).length}</div>
          </div>

          <div className="stats-container">
            <div>
              <div className="bar-label">VIDA</div>
              <div className="life-bar-outer">
                <div className="life-bar-fill" style={{ width: `${hp}%` }}></div>
              </div>
            </div>
            <div>
              <div className="bar-label">STAMINA</div>
              <div className="stamina-bar-outer">
                <div className="stamina-bar-fill" style={{ width: `${stamina}%` }}></div>
              </div>
            </div>
          </div>

          <div className={`bashira ${
            isJumping 
            ? `jump-frame-${jumpFrame}` 
            : (keysPressed.current["ArrowRight"] || keysPressed.current["ArrowLeft"]) 
              ? `run-frame-${runFrame}` 
              : `frame-${idleFrame}`
          }`} style={{ 
            left: `${pos}px`,
            bottom: `${50 + posY}px`,
            transform: `scaleX(${facing})`
          }}></div>
          
          {enemies.map(enemy => (
            enemy.hp > 0 && (
              <div key={enemy.id} style={{ left: `${enemy.x}px`, bottom: '80px', position: 'absolute', width: '40px', transition: 'opacity 0.3s' }}>
                 <div style={{ background: '#333', width: '40px', height: '5px', marginBottom: '5px', border: '1px solid #000' }}>
                    <div style={{ background: 'red', height: '100%', width: `${enemy.hp}%` }}></div>
                 </div>
                 <div style={{ width: '40px', height: '60px', background: '#555', border: '2px solid #000', boxShadow: '0 0 5px red' }}></div>
              </div>
            )
          ))}

          {shurikens.map(s => (
            <div key={s.id} className="shuriken" style={{ 
              left: `${s.x}px`, 
              bottom: `${90 + s.y}px` 
            }}></div>
          ))}

          {hp <= 0 && (
            <div className="overlay">
              <h1>BASHIRA FOI DERROTADO...</h1>
              <p>Eliminou {score/100} inimigos</p>
              <button className="btn-retry" onClick={() => window.location.reload()}>TENTAR DE NOVO</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;