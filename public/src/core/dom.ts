// DOM element cache - initialized after DOMContentLoaded

const $ = (id: string) => document.getElementById(id);

export interface DOMElements {
  wallet: HTMLElement;
  walletStatus: HTMLElement;
  wish: HTMLInputElement;
  amountSelect: HTMLElement;
  action: HTMLButtonElement;
  buddhaLight: HTMLElement;
  dharmaCanvas: HTMLCanvasElement;
  rippleCanvas: HTMLCanvasElement;
  lotusCanvas: HTMLCanvasElement;
  chainName: HTMLElement;
  chainPrev: HTMLElement;
  chainNext: HTMLElement;
  chainSwitcher: HTMLElement;
  msgQueue: HTMLElement;
  walletModal: HTMLElement;
  optMetamask: HTMLElement;
  optPhantom: HTMLElement;
  networkToggle: NodeListOf<Element>;
  wishWallLink: HTMLElement;
  wishWallModal: HTMLElement;
  wishWallList: HTMLElement;
  wishWallPage: HTMLElement;
  wishWallPrev: HTMLElement;
  wishWallNext: HTMLElement;
}

export let dom: DOMElements;

export function initDOM(): void {
  dom = {
    wallet: $('wallet')!,
    walletStatus: $('wallet-status')!,
    wish: $('wish') as HTMLInputElement,
    amountSelect: $('amount-select')!,
    action: $('action') as HTMLButtonElement,
    buddhaLight: $('buddha-light')!,
    dharmaCanvas: $('dharma-canvas') as HTMLCanvasElement,
    rippleCanvas: $('ripple-canvas') as HTMLCanvasElement,
    lotusCanvas: $('lotus-canvas') as HTMLCanvasElement,
    chainName: $('chain-name')!,
    chainPrev: $('chain-prev')!,
    chainNext: $('chain-next')!,
    chainSwitcher: $('chain-switcher')!,
    msgQueue: $('msg-queue')!,
    walletModal: $('wallet-modal')!,
    optMetamask: $('opt-metamask')!,
    optPhantom: $('opt-phantom')!,
    networkToggle: document.querySelectorAll('.network-opt'),
    wishWallLink: $('wish-wall-link')!,
    wishWallModal: $('wish-wall-modal')!,
    wishWallList: $('wish-wall-list')!,
    wishWallPage: $('wish-wall-page')!,
    wishWallPrev: $('wish-wall-prev')!,
    wishWallNext: $('wish-wall-next')!,
  };
}
