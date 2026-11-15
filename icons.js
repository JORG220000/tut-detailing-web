const line = path => '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="'+path+'"/></svg>';

export const icons = {
  expand: line('M14 4h6v6m0-6-7 7M10 20H4v-6m0 6 7-7'),
  right: line('M4 12h15m-6-6 6 6-6 6'),
  left: line('M20 12H5m6-6-6 6 6 6'),
  down: line('M12 4v15m-6-6 6 6 6-6'),
  menu: line('M3 6h18M3 12h18M3 18h18'),
  close: line('m6 6 12 12M18 6 6 18')
};

