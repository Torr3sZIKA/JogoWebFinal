import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

function App() {
  // Estados conforme o HUD [cite: 27-33]
  const [pos, setPos] = useState(50);
  const [hp, setHp] = useState(100);
  const [score, setScore] = useState(0);
  const [xp, setXp] = useState(0);
  const [shurikens, setShurikens] = useState([]);
  const [enemies, setEnemies] = useState([{ id: 1, x: 600, hp: 100 }]);

  // Controlos do Jogador [cite: 13, 74]
  const handleKeyDown = useCallback((e) => {
    if (hp <= 0) return;

    if (e.key === "ArrowRight") setPos(p => Math.min(p + 25, 760));
    if (e.key === "ArrowLeft") setPos(p => Math.max(p - 25, 0));
    
    // Atirar Shuriken 
    if (e.key.toLowerCase() === "f") {
      setShurikens(prev => [...prev, { id: Date.now(), x: pos + 40 }]);
    }
  }, [pos, hp]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Game Loop: Movimento e Colisões [cite: 22-23]
  useEffect(() => {
    const engine = setInterval(() => {
      // Mover projéteis
      setShurikens(prev => prev.map(s => ({ ...s, x: s.x + 12 })).filter(s => s.x < 800));

      // Lógica de dano e pontuação [cite: 23]
      setEnemies(prevEnemies => {
        return prevEnemies.map(enemy => {
          const hit = shurikens.find(s => s.x > enemy.x && s.x < enemy.x + 40);
          if (hit && enemy.hp > 0) {
            const newHp = enemy.hp - 25;
            if (newHp <= 0) {
              setScore(s => s + 100); // Pontuação positiva [cite: 23]
              setXp(x => x + 10); // Ganho de XP [cite: 32]
            }
            return { ...enemy, hp: newHp };
          }
          return enemy;
        });
      });
    }, 50);

    return () => clearInterval(engine);
  }, [shurikens]);

  return (
    <div className="game-container">
      {/* HUD Principal [cite: 26-34] */}
      <div className="hud">
        <div>PONTUAÇÃO: {score}</div>
        <div>XP: {xp}</div>
        <div>ARMA: Shuriken</div>
      </div>

      {/* Bashira e Inimigos [cite: 58] */}
      <div className="bashira" style={{ left: pos }}></div>
      
      {enemies.map(enemy => (
        enemy.hp > 0 && (
          <div key={enemy.id} className="enemy" style={{ left: enemy.x }}>
            <div style={{ background: 'red', height: '4px', width: `${enemy.hp}%` }}></div>
          </div>
        )
      ))}

      {/* Shurikens  */}
      {shurikens.map(s => (
        <div key={s.id} className="shuriken" style={{ left: s.x, bottom: '75px' }}></div>
      ))}

      {/* Barra de Vida [cite: 29] */}
      <div style={{ position: 'absolute', bottom: '15px', left: '20px' }}>
        <span>VIDA</span>
        <div className="life-bar-outer">
          <div className="life-bar-fill" style={{ width: `${hp}%` }}></div>
        </div>
      </div>

      {hp <= 0 && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', background: 'rgba(0,0,0,0.8)', padding: '20px' }}>
          <h1>BASHIRA FICOU PRESO...</h1>
          <button onClick={() => window.location.reload()}>TENTAR FUGA</button>
        </div>
      )}
    </div>
  );
}

export default App;