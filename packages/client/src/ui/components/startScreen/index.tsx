import { ChangeEvent, FormEvent, useState } from 'react';
import style from './index.module.css';

export interface StartScreenProps {
  onNameSubmit: (name: string) => void;
}

export function StartScreen(props: StartScreenProps) {
  const [name, setName] = useState('');

  function onSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (name.length >= 3 && name.match(/^[A-Za-z0-9]{3,15}$/)) {
      props.onNameSubmit(name);
    }
  }

  function onInputChange(ev: ChangeEvent<HTMLInputElement>) {
    const res = ev.target.value.match(/[A-Za-z0-9]*/);
    if (res) {
      setName(res[0]);
    }

    if (!ev.target.value.match(/^[A-Za-z0-9]{3,15}$/)) {
      ev.target.setCustomValidity('Name should contain at least 3 letters or numbers, e.g. Kolyan999');
    } else {
      ev.target.setCustomValidity('');
    }
  }

  return (
    <div className={style.root}>
      <div className={style.middle}>
        <form onSubmit={onSubmit}>
          <input
            type='text'
            minLength={3}
            maxLength={15}
            value={name}
            onChange={onInputChange}
            placeholder='Your name'
            pattern='[A-Za-z0-9]{3,15}'
          />
          <input type='submit' value='Go!' />
        </form>
      </div>
    </div>
  );
}
