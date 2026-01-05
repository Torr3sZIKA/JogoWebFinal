import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [pos, setPos] = useState(50);
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

  const [enemies, setEnemies] = useState([
    { id: 1, x: 600, hp: 100, dir: -1, speed: 3 }, // Ajusta a speed individual aqui
    { id: 2, x: window.innerWidth - 100, hp: 100, dir: -1, speed: 2 }
  ]);

  useEffect(() => {
    const anim = setInterval(() => setIdleFrame(prev => (prev === 1 ? 2 : 1)), 500);
    return () => clearInterval(anim);
  }, []);

  useEffect(() => {
    if (!gameStarted || hp <= 0) return;
    const t = setInterval(() => setTimer(prev => prev + 1), 1000);
    return () => clearInterval(t);
  }, [hp, gameStarted]);

  useEffect(() => {
    if (!gameStarted) return;
    const reg = setInterval(() => setStamina(s => Math.min(s + 3, 100)), 200);
    return () => clearInterval(reg);
  }, [gameStarted]);

  useEffect(() => {
    if (!gameStarted) return;
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
    return () => clearInterval(physics);
  }, [velY, gameStarted]);

  const handleKeyDown = useCallback((e) => {
    keysPressed.current[e.key] = true;
    if (!gameStarted || hp <= 0) return;

    if ((e.key === "ArrowUp" || e.code === "Space") && !isJumping) {
      setIsJumping(true);
      setVelY(JUMP_FORCE);
    }
    
    if (e.key.toLowerCase() === "f" && stamina >= 25) {
      const startX = facingRef.current === 1 ? posRef.current + 60 : posRef.current - 20;
      // LANÇAMENTO MAIS BAIXO: y definido como posY + 8
      setShurikens(prev => [...prev, { id: Date.now(), x: startX, y: posYRef.current + 8, dir: facingRef.current }]);
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

  useEffect(() => {
    if (!gameStarted) return;
    const engine = setInterval(() => {
      
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

          // COLISÃO AJUSTADA: 90 + s.y para bater no corpo do inimigo agora que o shuriken voa baixo
          const collidingShuriken = shurikens.find(s => 
            s.x > enemy.x - 20 && s.x < enemy.x + 50 &&
            Math.abs((90 + s.y) - 110) < 50
          );

          let newHp = enemy.hp;
          if (collidingShuriken) {
            hitShurikenIds.push(collidingShuriken.id);
            newHp -= 20;
            if (newHp <= 0) {
              setScore(s => s + 100);
              setXp(x => x + 15);
            }
          }

          // VELOCIDADE DOS INIMIGOS: Multiplicado pela speed definida ou valor fixo
          let newX = enemy.x + (enemy.dir * (enemy.speed || 2.5));
          let newDir = enemy.dir;
          if (newX > window.innerWidth - 60) newDir = -1;
          if (newX < 0) newDir = 1;

          if (Math.abs(newX - posRef.current) < 55 && posYRef.current < 70 && newHp > 0) {
            setHp(h => Math.max(h - 0.5, 0));
          }

          return { ...enemy, x: newX, hp: newHp, dir: newDir };
        });
      });

      setShurikens(prev => 
        prev.filter(s => !hitShurikenIds.includes(s.id))
            .map(s => ({ ...s, x: s.x + (25 * s.dir) }))
            .filter(s => s.x > -100 && s.x < window.innerWidth + 100)
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
            <div>XP: {xp} | ARMA: Shuriken</div>
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

          <div className={`bashira frame-${idleFrame}`} style={{ 
            left: `${pos}px`,
            bottom: `${50 + posY}px`,
            transform: `scaleX(${facing})`
          }}></div>
          
          {enemies.map(enemy => (
            enemy.hp > 0 && (
              <div key={enemy.id} className="enemy" style={{ left: `${enemy.x}px`, bottom: '80px', position: 'absolute' }}>
                 <div style={{ background: '#333', width: '40px', height: '5px', marginBottom: '5px' }}>
                    <div style={{ background: 'red', height: '100%', width: `${enemy.hp}%` }}></div>
                 </div>
                 <div style={{ width: '40px', height: '60px', background: '#555', border: '1px solid #000' }}></div>
              </div>
            )
          ))}

          {shurikens.map(s => (
            <div key={s.id} className="shuriken" style={{ 
              left: `${s.x}px`, 
              bottom: `${90 + s.y}px` // ALTURA VISUAL BAIXA: 90px de base
            }}></div>
          ))}

          {hp <= 0 && (
            <div className="overlay">
              <h1>BASHIRA FICOU PRESO...</h1>
              <button className="btn-retry" onClick={() => window.location.reload()}>TENTAR FUGA</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;