declare module '@radix-ui/react-icons' {
  import * as React from 'react';
  
  export interface IconProps extends React.SVGAttributes<SVGElement> {
    children?: never;
    color?: string;
    size?: string | number;
  }

  export type Icon = React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGElement>>;

  export const CheckIcon: Icon;
  export const ChevronDownIcon: Icon;
  export const ChevronUpIcon: Icon;
  // Add other icons as needed
}