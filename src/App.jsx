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
  
  // Adicionada a propriedade 'dir' para controlar o movimento (1 direita, -1 esquerda)
  const [enemies, setEnemies] = useState([
    { id: 1, x: 600, hp: 100, dir: -1 },
    { id: 2, x: 1000, hp: 100, dir: -1 }
  ]);

  useEffect(() => {
    if (hp <= 0) return;
    const t = setInterval(() => setTimer(prev => prev + 1), 1000);
    return () => clearInterval(t);
  }, [hp]);

  useEffect(() => {
    const reg = setInterval(() => {
      setStamina(s => Math.min(s + 3, 100));
    }, 200);
    return () => clearInterval(reg);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (hp <= 0) return;
    if (e.key === "ArrowRight") setPos(p => Math.min(p + 35, 1150));
    if (e.key === "ArrowLeft") setPos(p => Math.max(p - 35, 0));
    
    if (e.key.toLowerCase() === "f" && stamina >= 10) {
      setShurikens(prev => [...prev, { id: Date.now(), x: pos + 60 }]);
      setStamina(s => s - 10);
    }
  }, [pos, hp, stamina]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // GAME LOOP: Movimento dos Projéteis + Movimento dos Inimigos + Colisões
  useEffect(() => {
    const engine = setInterval(() => {
      // 1. Mover Shurikens
      setShurikens(prev => prev.map(s => ({ ...s, x: s.x + 20 })).filter(s => s.x < 1250));

      // 2. Mover Inimigos e Verificar Colisões
      setEnemies(prevEnemies => {
        return prevEnemies.map(enemy => {
          if (enemy.hp <= 0) return enemy;

          // Lógica de Movimento do Inimigo
          let newX = enemy.x + (enemy.dir * 4); // Velocidade do inimigo
          let newDir = enemy.dir;

          // Mudar direção ao atingir limites da tela (1200px)
          if (newX > 1150) newDir = -1;
          if (newX < 200) newDir = 1; // Patrulham apenas a parte direita/centro

          // Deteção de acerto por Shuriken
          const hit = shurikens.some(s => s.x > enemy.x && s.x < enemy.x + 50);
          let newHp = enemy.hp;
          if (hit) {
            newHp -= 20;
            if (newHp <= 0) {
              setScore(s => s + 100);
              setXp(x => x + 15);
            }
          }

          // Deteção de colisão com o Bashira (Dano ao Jogador)
          if (Math.abs(newX - pos) < 40 && newHp > 0) {
            setHp(h => Math.max(h - 1, 0)); // Perde vida ao tocar
          }

          return { ...enemy, x: newX, hp: newHp, dir: newDir };
        });
      });
    }, 50);

    return () => clearInterval(engine);
  }, [shurikens, pos]); // 'pos' adicionado para detetar toque inimigo

  return (
    <div className="game-container">
      <div className="hud">
        <div>PONTUAÇÃO: {score}</div>
        <div className="hud-center">
            {Math.floor(timer / 60).toString().padStart(2, '0')}:
            {(timer % 60).toString().padStart(2, '0')}
        </div>
        <div>XP: {xp} | ARMA: Shuriken</div>
      </div>

      <div className="bashira" style={{ left: `${pos}px` }}></div>
      
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
        <div 
          key={s.id} 
          className="shuriken" 
          style={{ left: `${s.x}px`, bottom: '120px' }}
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