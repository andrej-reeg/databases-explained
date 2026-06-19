import React from 'react';
import {Highlight, type PrismTheme} from 'prism-react-renderer';

// Highlight SQL with prism-react-renderer (the same engine Docusaurus uses, so
// the SQL grammar is guaranteed present) and colour tokens inline from the
// theme - works in light and dark with no extra CSS.
export function makeHighlighter(theme: PrismTheme) {
  return (code: string) => (
    <Highlight code={code} language="sql" theme={theme}>
      {({tokens, getLineProps, getTokenProps}) => (
        <>
          {tokens.map((line, i) => (
            <span {...getLineProps({line})} key={i}>
              {line.map((token, key) => (
                <span {...getTokenProps({token})} key={key} />
              ))}
              {i < tokens.length - 1 ? '\n' : ''}
            </span>
          ))}
        </>
      )}
    </Highlight>
  );
}
