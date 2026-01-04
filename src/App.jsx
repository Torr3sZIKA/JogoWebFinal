import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

function App() {
  const [pos, setPos] = useState(50);
  const [hp, setHp] = useState(100);
  const [stamina, setStamina] = useState(100);
  const [score, setScore] = useState(0);
  const [xp, setXp] = useState(0);
  const [timer, setTimer] = useState(0);
  const [shurikens, setShurikens] = useState([]);
  const [enemies, setEnemies] = useState([
    { id: 1, x: 600, hp: 100 },
    { id: 2, x: 950, hp: 100 }
  ]);

  // Lógica do Cronómetro
  useEffect(() => {
    if (hp <= 0) return;
    const t = setInterval(() => setTimer(prev => prev + 1), 1000);
    return () => clearInterval(t);
  }, [hp]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Regeneração de Stamina
  useEffect(() => {
    const reg = setInterval(() => {
      setStamina(s => Math.min(s + 2, 100));
    }, 200);
    return () => clearInterval(reg);
  }, []);

  // Controlos (Ajustado para 1200px)
  const handleKeyDown = useCallback((e) => {
    if (hp <= 0) return;

    if (e.key === "ArrowRight") setPos(p => Math.min(p + 35, 1150));
    if (e.key === "ArrowLeft") setPos(p => Math.max(p - 35, 0));
    
    // Disparo de Shuriken
    if (e.key.toLowerCase() === "f" && stamina >= 10) {
      const newShuriken = { id: Date.now(), x: pos + 50 };
      setShurikens(prev => [...prev, newShuriken]);
      setStamina(s => s - 10);
    }
  }, [pos, hp, stamina]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Game Loop Corrigido
  useEffect(() => {
    const engine = setInterval(() => {
      // 1. Mover Shurikens e remover as que saem da tela (1200px)
      setShurikens(prev => prev.map(s => ({ ...s, x: s.x + 20 })).filter(s => s.x < 1200));

      // 2. Detetar Colisões e Dano
      setEnemies(prevEnemies => {
        return prevEnemies.map(enemy => {
          if (enemy.hp <= 0) return enemy;

          // Verificar se alguma shuriken acertou este inimigo
          const hitIndex = shurikens.findIndex(s => s.x > enemy.x && s.x < enemy.x + 50);
          
          if (hitIndex !== -1) {
            // Remove a shuriken que atingiu (opcional, mas melhora o feedback)
            const newHp = enemy.hp - 25;
            if (newHp <= 0) {
              setScore(s => s + 100);
              setXp(x => x + 15);
            }
            return { ...enemy, hp: newHp };
          }
          return enemy;
        });
      });
    }, 50);

    return () => clearInterval(engine);
  }, [shurikens]); // Importante observar as shurikens para o loop de colisão

  return (
    <div className="game-container">
      <div className="hud">
        <div>PONTUAÇÃO: {score}</div>
        <div className="hud-center">{formatTime(timer)}</div>
        <div>XP: {xp} | ARMA: Shuriken</div>
      </div>

      <div className="bashira" style={{ left: pos }}></div>
      
      {enemies.map(enemy => (
        enemy.hp > 0 && (
          <div key={enemy.id} className="enemy" style={{ left: enemy.x, bottom: '80px', position: 'absolute' }}>
             <div style={{ background: '#333', width: '40px', height: '5px', marginBottom: '5px' }}>
                <div style={{ background: 'red', height: '100%', width: `${enemy.hp}%` }}></div>
             </div>
             <div style={{ width: '40px', height: '60px', background: '#555', border: '1px solid #000' }}></div>
          </div>
        )
      ))}

      {/* RENDERIZAÇÃO DAS SHURIKENS COM Z-INDEX ALTO */}
      {shurikens.map(s => (
        <div 
          key={s.id} 
          className="shuriken" 
          style={{ 
            left: s.x, 
            bottom: '120px', 
            position: 'absolute',
            zIndex: 999 
          }}
        ></div>
      ))}

      <div className="stats-container">
        <div>
          <div className="bar-label">VIDA</div>
          <div className="life-bar-outer"><div className="life-bar-fill" style={{ width: `${hp}%` }}></div></div>
        </div>
        <div>
          <div className="bar-label">STAMINA</div>
          <div className="stamina-bar-outer"><div className="stamina-bar-fill" style={{ width: `${stamina}%` }}></div></div>
        </div>
      </div>

      {hp <= 0 && (
        <div className="overlay">
          <h1>BASHIRA FICOU PRESO...</h1>
          <button className="btn-retry" onClick={() => window.location.reload()}>TENTAR FUGA</button>
        </div>
      )}
    </div>
  );
}

export default App;