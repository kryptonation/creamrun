import { classNames } from "primereact/utils";

export const gridToolTipOptins = (tooltip) => {
  return {
    tooltip,
    tooltipOptions: {
      position: 'top',
      className: "regular-text bg-transparent primary-tooltip",
    },
    pt: {
      tooltip: {
        text: { className: 'text-dark' },
        arrow: { className: classNames('bg-transparent') },
      },
    },
  };
};
