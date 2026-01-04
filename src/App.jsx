import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

function App() {
  // Estados conforme o HUD
  const [pos, setPos] = useState(50);
  const [hp, setHp] = useState(100);
  const [stamina, setStamina] = useState(100);
  const [score, setScore] = useState(0);
  const [xp, setXp] = useState(0);
  const [timer, setTimer] = useState(0);
  const [shurikens, setShurikens] = useState([]);
  const [enemies, setEnemies] = useState([
    { id: 1, x: 600, hp: 100 },
    { id: 2, x: 900, hp: 100 }
  ]);

  // Lógica do Cronómetro
  useEffect(() => {
    if (hp <= 0) return;
    const t = setInterval(() => setTimer(prev => prev + 1), 1000);
    return () => clearInterval(t);
  }, [hp]);

  // Formatar tempo (00:00)
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

  // Controlos do Jogador (Ajustados para 1200px)
  const handleKeyDown = useCallback((e) => {
    if (hp <= 0) return;

    // Movimento com limite em 1150 (1200 largura - 50 do personagem)
    if (e.key === "ArrowRight") setPos(p => Math.min(p + 35, 1150));
    if (e.key === "ArrowLeft") setPos(p => Math.max(p - 35, 0));
    
    // Atirar Shuriken (Gasta 10 de Stamina)
    if (e.key.toLowerCase() === "f" && stamina >= 10) {
      setShurikens(prev => [...prev, { id: Date.now(), x: pos + 50 }]);
      setStamina(s => s - 10);
    }
  }, [pos, hp, stamina]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Game Loop: Movimento e Colisões
  useEffect(() => {
    const engine = setInterval(() => {
      // Mover projéteis (Limite 1200px)
      setShurikens(prev => prev.map(s => ({ ...s, x: s.x + 15 })).filter(s => s.x < 1200));

      // Lógica de dano
      setEnemies(prevEnemies => {
        return prevEnemies.map(enemy => {
          const hit = shurikens.find(s => s.x > enemy.x && s.x < enemy.x + 50);
          if (hit && enemy.hp > 0) {
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
  }, [shurikens]);

  return (
    <div className="game-container">
      {/* HUD Principal */}
      <div className="hud">
        <div>PONTUAÇÃO: {score}</div>
        <div className="hud-center">{formatTime(timer)}</div>
        <div>XP: {xp} | ARMA: Shuriken</div>
      </div>

      {/* Bashira e Inimigos */}
      <div className="bashira" style={{ left: pos }}></div>
      
      {enemies.map(enemy => (
        enemy.hp > 0 && (
          <div key={enemy.id} className="enemy" style={{ left: enemy.x, bottom: '80px', position: 'absolute' }}>
             <div style={{ background: '#333', width: '40px', height: '5px', marginBottom: '5px' }}>
                <div style={{ background: 'red', height: '100%', width: `${enemy.hp}%` }}></div>
             </div>
             <div style={{ width: '40px', height: '60px', background: '#555' }}></div>
          </div>
        )
      ))}

      {/* Shurikens */}
      {shurikens.map(s => (
        <div key={s.id} className="shuriken" style={{ left: s.x, bottom: '110px' }}></div>
      ))}

      {/* Barras de Status */}
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

      {hp <= 0 && (
        <div className="overlay">
          <h1>BASHIRA FICOU PRESO NA FORTALEZA...</h1>
          <button className="btn-retry" onClick={() => window.location.reload()}>TENTAR FUGA</button>
        </div>
      )}
    </div>
  );
}

export default App;