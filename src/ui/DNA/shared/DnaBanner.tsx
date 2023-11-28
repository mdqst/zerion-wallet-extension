import React from 'react';
import cn from 'classnames';
import CloseIcon from 'jsx:src/ui/assets/close.svg';
import { UnstyledButton } from 'src/ui/ui-kit/UnstyledButton';
import BannerImg from '../assets/dna-banner.png';
import * as styles from './styles.module.css';

export function DnaBanner({
  onDismiss,
  children,
  className,
  ...props
}: {
  onDismiss?(): void;
} & React.HTMLProps<HTMLDivElement>) {
  return (
    <div {...props} className={cn(className, styles.banner)}>
      <img src={BannerImg} alt="zerion dna" className={styles.image} />
      {onDismiss ? (
        <UnstyledButton
          onClick={onDismiss}
          aria-label="close"
          className={styles.closeButton}
        >
          <CloseIcon style={{ width: 16, height: 16 }} />
        </UnstyledButton>
      ) : null}
      {children}
    </div>
  );
}
