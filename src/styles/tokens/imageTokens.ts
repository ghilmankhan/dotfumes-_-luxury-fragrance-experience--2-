export const imageFocalClasses = {
  bottom: 'object-bottom',
  center: 'object-center',
  left: 'object-left',
  right: 'object-right',
  top: 'object-top',
} as const;

export type ImageFocalPoint = keyof typeof imageFocalClasses;
