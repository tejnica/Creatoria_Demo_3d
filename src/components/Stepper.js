// src/components/Stepper.js
import React from 'react';

export default function Stepper({ step, steps }) {
  // Контейнер степпера: горизонтальный flex
  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: '1.5rem auto',
    maxWidth: '800px',
  };

  // Обёртка для одного шага
  const stepWrapperStyle = { display: 'flex', alignItems: 'center' };

  // Круг с номером шага
  const circleStyle = (active) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: active ? '#F59E0B' : '#374151',
    color: active ? '#000' : '#fff',
    fontWeight: 'bold',
    transition: 'background 0.2s',
  });

  // Стиль для подписи шага
  const labelStyle = (active) => ({
    marginLeft: '8px',
    fontSize: '0.75rem',
    color: active ? '#FBBF24' : '#9CA3AF',
  });

  // Линия между шагами
  const connectorStyle = {
    flex: 1,
    height: '2px',
    backgroundColor: '#4B5563',
    margin: '0 12px',
  };

  return (
    <div style={containerStyle}>
      {steps.map((label, idx) => {
        const isActive = step === idx + 1;
        return (
          <React.Fragment key={idx}>
            <div style={stepWrapperStyle}>
              <div style={circleStyle(isActive)}>{idx + 1}</div>
              <span style={labelStyle(isActive)}>{label}</span>
            </div>
            {idx < steps.length - 1 && <div style={connectorStyle} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}