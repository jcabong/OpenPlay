// Changes made to LogGamePage.jsx

import React from 'react';
import { Dropdown } from 'your-dropdown-library'; // Make sure to adjust the import according to your project structure
import './LogGamePage.css'; // Ensure your styling is in line with your theme
import { useForm } from 'react-hook-form'; // Example library for form handling

const LogGamePage = ({ opponentTags, onSubmit }) => {
  const { register, handleSubmit } = useForm();

  return (
    <div className='log-game-page'>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className='input-group'>
          <label htmlFor='opponent'>Choose Opponent</label>
          <Dropdown 
            options={opponentTags}
            placeholder='Search User...'
            search={true} // Assuming your dropdown supports search
            {...register('opponent')}
          />
        </div>
        <div className='input-group'>
          <label htmlFor='location'>Location</label>
          <input 
            type='text' 
            id='location' 
            {...register('location')} 
            className='glass-input'
            placeholder='Enter location...'
          />
        </div>
        <button type='submit' className='submit-button'>Log Game</button>
      </form>
    </div>
  );
};

export default LogGamePage;

// CSS Changes
/* LogGamePage.css */
.log-game-page {
  background: rgba(255, 255, 255, 0.1); /* glass-morphism background */
  border-radius: 10px;
  padding: 20px;
}

.input-group {
  margin-bottom: 15px;
}

.glass-input {
  border: 1px solid rgba(255, 255, 255, 0.5);
  padding: 10px;
  border-radius: 5px;
  color: var(--ink-100);
  background: rgba(255, 255, 255, 0.2);
}

.submit-button {
  background-color: var(--ink-50);
  color: var(--white);
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
}

.submit-button:hover {
  background-color: var(--ink-100);
}