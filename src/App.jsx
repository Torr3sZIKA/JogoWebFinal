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

  const GRAVITY = 1.8;
  const JUMP_FORCE = 25;
  const posRef = useRef(pos);
  const posYRef = useRef(posY);

  useEffect(() => {
    posRef.current = pos;
    posYRef.current = posY;
  }, [pos, posY]);

  const [enemies, setEnemies] = useState([
    { id: 1, x: 600, hp: 100, dir: -1 },
    { id: 2, x: window.innerWidth - 100, hp: 100, dir: -1 }
  ]);

  useEffect(() => {
    if (!gameStarted || hp <= 0) return;
    const t = setInterval(() => setTimer(prev => prev + 1), 1000);
    return () => clearInterval(t);
  }, [hp, gameStarted]);

  useEffect(() => {
    if (!gameStarted) return;
    const reg = setInterval(() => {
      setStamina(s => Math.min(s + 3, 100));
    }, 200);
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
    if (!gameStarted || hp <= 0) return;

    if ((e.key === "ArrowUp" || e.code === "Space") && !isJumping) {
      setIsJumping(true);
      setVelY(JUMP_FORCE);
    }
    
    if (e.key === "ArrowRight") {
      setPos(p => Math.min(p + 35, window.innerWidth - 110));
      setFacing(1);
    }
    if (e.key === "ArrowLeft") {
      setPos(p => Math.max(p - 35, 0));
      setFacing(-1);
    }
    
    if (e.key.toLowerCase() === "f" && stamina >= 25) {
      const startX = facing === 1 ? pos + 60 : pos - 20;
      setShurikens(prev => [...prev, { id: Date.now(), x: startX, y: posY, dir: facing }]);
      setStamina(s => s - 25);
    }
  }, [pos, hp, stamina, facing, isJumping, posY, gameStarted]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (!gameStarted) return;
    const engine = setInterval(() => {
      let hitShurikenIds = [];

      setEnemies(prevEnemies => {
        return prevEnemies.map(enemy => {
          if (enemy.hp <= 0) return enemy;

          const collidingShuriken = shurikens.find(s => 
            s.x > enemy.x - 20 && s.x < enemy.x + 50 &&
            Math.abs((120 + s.y) - 110) < 50
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

          let newX = enemy.x + (enemy.dir * 4);
          let newDir = enemy.dir;
          if (newX > window.innerWidth - 60) newDir = -1;
          if (newX < 0) newDir = 1;

          if (Math.abs(newX - posRef.current) < 45 && posYRef.current < 60 && newHp > 0) {
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
    }, 50);

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

          {/* PLAYER COM IMAGEM E ESPELHAMENTO */}
          <div className="bashira" style={{ 
            left: `${pos}px`,
            bottom: `${80 + posY}px`,
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
            <div key={s.id} className="shuriken" style={{ left: `${s.x}px`, bottom: `${120 + (s.y || 0)}px` }}></div>
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