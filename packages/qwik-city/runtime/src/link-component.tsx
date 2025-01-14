import {
  component$,
  Slot,
  type QwikIntrinsicElements,
  untrack,
  event$,
  useComputed$,
} from '@builder.io/qwik';
import { getClientNavPath, getPrefetchDataset } from './utils';
import { loadClientData } from './use-endpoint';
import { useLocation, useNavigate } from './use-functions';

/**
 * @public
 */
export const Link = component$<LinkProps>((props) => {
  const nav = useNavigate();
  const loc = useLocation();
  const originalHref = props.href;
  const { onClick$, reload, ...linkProps } = (() => props)();
  const clientNavPath = untrack(() => getClientNavPath(linkProps, loc));
  const prefetchDataset = untrack(() => getPrefetchDataset(props, clientNavPath, loc));
  linkProps['preventdefault:click'] = !!clientNavPath;
  linkProps.href = clientNavPath || originalHref;
  const onPrefetch =
    prefetchDataset != null
      ? event$((ev: any, elm: HTMLAnchorElement) =>
          prefetchLinkResources(elm as HTMLAnchorElement, ev.type === 'qvisible')
        )
      : undefined;
  const handleClick = event$(async (_: any, elm: HTMLAnchorElement) => {
    if (elm.href) {
      elm.setAttribute('aria-pressed', 'true');
      await nav(elm.href, { forceReload: reload });
      elm.removeAttribute('aria-pressed');
    }
  });
  const ariaCurrent = useComputed$(() =>
    Boolean(props.href) &&
    (loc.url.pathname === props.href ||
      (!props.end &&
        loc.url.pathname.startsWith(props.href!) &&
        loc.url.pathname.charAt(props.href!.length) === '/'))
      ? 'page'
      : undefined
  );
  return (
    <a
      {...linkProps}
      aria-current={ariaCurrent.value}
      onClick$={[onClick$, handleClick]}
      data-prefetch={prefetchDataset}
      onMouseOver$={onPrefetch}
      onFocus$={onPrefetch}
      onQVisible$={onPrefetch}
    >
      <Slot />
    </a>
  );
});

/**
 * Client-side only
 */
export const prefetchLinkResources = (elm: HTMLAnchorElement, isOnVisible?: boolean) => {
  if (elm && elm.href && elm.hasAttribute('data-prefetch')) {
    if (!windowInnerWidth) {
      windowInnerWidth = innerWidth;
    }

    if (!isOnVisible || (isOnVisible && windowInnerWidth < 520)) {
      // either this is a mouseover event, probably on desktop
      // or the link is visible, and the viewport width is less than X
      loadClientData(new URL(elm.href), elm);
    }
  }
};

let windowInnerWidth = 0;

type AnchorAttributes = QwikIntrinsicElements['a'];

/**
 * @public
 */
export interface LinkProps extends AnchorAttributes {
  /**
   * The prefetch prop tells Qwik to prefetch the code for the Link's destination.
   */
  prefetch?: boolean;
  /**
   * The reload prop forces a reload of the current route when a Link is clicked, even if the current route is the same as the Link's destination.
   */
  reload?: boolean;
  /**
   * The end prop changes the matching logic for the aria-current attribute to only match when current location pathname and href are identical. Otherwise, aria-current will match any location that starts with the href value.
   */
  end?: boolean;
}
