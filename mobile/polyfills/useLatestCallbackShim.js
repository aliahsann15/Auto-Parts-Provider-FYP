const { useCallback, useRef } = require('react');

function useLatestCallback(fn) {
  const ref = useRef(fn);
  ref.current = fn;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((...args) => ref.current(...args), []);
}

module.exports = useLatestCallback;
module.exports.default = useLatestCallback;
