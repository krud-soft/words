import React, {
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useMemo,
} from 'react';
import clsx from 'clsx';
import OriginalContent from '@theme-original/CodeBlock/Content';
import {usePrismTheme} from '@docusaurus/theme-common';
import {useCodeBlockContext} from '@docusaurus/theme-common/internal';
import Line from '@theme/CodeBlock/Line';
import type {Props} from '@theme/CodeBlock/Content';
import type {
  LineInputProps,
  LineOutputProps,
  PrismTheme,
  PrismThemeEntry,
  Token as HighlightToken,
  TokenInputProps,
  TokenOutputProps,
} from 'prism-react-renderer';
import {Lexer} from '@words-lang/parser/dist/lexer/lexer';
import {TokenType, type Token as WordsToken} from '@words-lang/parser/dist/lexer/token';

import styles from './styles.module.css';

type ThemeDictionary = Record<string, PrismThemeEntry | undefined> & {
  root: PrismThemeEntry;
  plain: PrismThemeEntry;
};

const WDS_LANGUAGES = new Set(['wds', 'words']);

const TOKEN_TYPE_MAP: Partial<Record<TokenType, string[]>> = {
  [TokenType.System]: ['keyword'],
  [TokenType.Module]: ['keyword'],
  [TokenType.Process]: ['keyword'],
  [TokenType.State]: ['keyword'],
  [TokenType.Context]: ['keyword'],
  [TokenType.Screen]: ['keyword'],
  [TokenType.View]: ['keyword'],
  [TokenType.Provider]: ['keyword'],
  [TokenType.Adapter]: ['keyword'],
  [TokenType.Interface]: ['keyword'],
  [TokenType.Modules]: ['keyword'],
  [TokenType.Props]: ['keyword'],
  [TokenType.Uses]: ['keyword'],
  [TokenType.Returns]: ['keyword'],
  [TokenType.Receives]: ['keyword'],
  [TokenType.Start]: ['keyword'],
  [TokenType.Implements]: ['keyword'],
  [TokenType.Includes]: ['keyword'],
  [TokenType.When]: ['keyword'],
  [TokenType.Enter]: ['keyword'],
  [TokenType.If]: ['keyword'],
  [TokenType.For]: ['keyword'],
  [TokenType.As]: ['keyword'],
  [TokenType.Is]: ['operator'],
  [TokenType.IsNot]: ['operator'],
  [TokenType.TString]: ['builtin'],
  [TokenType.TInteger]: ['builtin'],
  [TokenType.TFloat]: ['builtin'],
  [TokenType.TBoolean]: ['builtin'],
  [TokenType.TContext]: ['builtin'],
  [TokenType.TList]: ['builtin'],
  [TokenType.TMap]: ['builtin'],
  [TokenType.StringLit]: ['string'],
  [TokenType.IntegerLit]: ['number'],
  [TokenType.FloatLit]: ['number'],
  [TokenType.BooleanLit]: ['boolean'],
  [TokenType.PascalIdent]: ['class-name'],
  [TokenType.CamelIdent]: ['property'],
  [TokenType.LParen]: ['punctuation'],
  [TokenType.RParen]: ['punctuation'],
  [TokenType.Comma]: ['punctuation'],
  [TokenType.Dot]: ['punctuation'],
  [TokenType.Question]: ['operator'],
  [TokenType.Comment]: ['comment'],
  [TokenType.Unknown]: ['plain'],
};

const Pre = React.forwardRef<HTMLPreElement, ComponentProps<'pre'>>(
  (props, ref) => (
    <pre
      ref={ref}
      tabIndex={0}
      {...props}
      className={clsx(props.className, styles.codeBlock, 'thin-scrollbar')}
    />
  ),
);

function Code(props: ComponentProps<'code'>) {
  const {metadata} = useCodeBlockContext();

  return (
    <code
      {...props}
      className={clsx(
        props.className,
        styles.codeBlockLines,
        metadata.lineNumbersStart !== undefined &&
          styles.codeBlockLinesWithNumbering,
      )}
      style={{
        ...props.style,
        counterReset:
          metadata.lineNumbersStart === undefined
            ? undefined
            : `line-count ${metadata.lineNumbersStart - 1}`,
      }}
    />
  );
}

function themeToDictionary(theme: PrismTheme, language: string): ThemeDictionary {
  const themeDictionary = theme.styles.reduce<Record<string, PrismThemeEntry>>(
    (acc, themeEntry) => {
      if (themeEntry.languages && !themeEntry.languages.includes(language)) {
        return acc;
      }

      themeEntry.types.forEach((type) => {
        acc[type] = {...acc[type], ...themeEntry.style};
      });
      return acc;
    },
    {},
  );

  return {
    ...themeDictionary,
    root: theme.plain,
    plain: {...theme.plain, backgroundColor: undefined},
  };
}

function tokenTypesFor(tokenType: TokenType): string[] {
  return TOKEN_TYPE_MAP[tokenType] ?? ['plain'];
}

function normalizeEmptyLines(lines: HighlightToken[][]): HighlightToken[][] {
  return lines.map((line) =>
    line.length === 0
      ? [{types: ['plain'], content: '\n', empty: true}]
      : line,
  );
}

function pushToken(
  lines: HighlightToken[][],
  content: string,
  types: string[],
): void {
  if (content.length === 0) {
    return;
  }

  const parts = content.split('\n');
  parts.forEach((part, index) => {
    if (index > 0) {
      lines.push([]);
    }
    if (part.length > 0) {
      lines[lines.length - 1]!.push({types, content: part});
    }
  });
}

function tokenizeWds(code: string): HighlightToken[][] {
  const lexerTokens = new Lexer(code).tokenize();
  const lines: HighlightToken[][] = [[]];
  let cursor = 0;

  lexerTokens.forEach((lexerToken: WordsToken) => {
    if (lexerToken.type === TokenType.EOF) {
      return;
    }

    if (lexerToken.offset > cursor) {
      pushToken(lines, code.slice(cursor, lexerToken.offset), ['plain']);
    }

    pushToken(lines, lexerToken.value, tokenTypesFor(lexerToken.type));
    cursor = lexerToken.offset + lexerToken.value.length;
  });

  if (cursor < code.length) {
    pushToken(lines, code.slice(cursor), ['plain']);
  }

  return normalizeEmptyLines(lines);
}

function useGetLineProps(themeDictionary: ThemeDictionary) {
  return useCallback(
    ({
      className,
      style,
      line,
      ...rest
    }: LineInputProps): LineOutputProps => {
      const output: LineOutputProps = {
        ...rest,
        className: clsx('token-line', className),
      };

      output.style = themeDictionary.plain;

      if (typeof style === 'object') {
        output.style = {...output.style, ...style};
      }

      return output;
    },
    [themeDictionary],
  );
}

function useGetTokenProps(themeDictionary: ThemeDictionary) {
  const styleForToken = useCallback(
    ({types, empty}: HighlightToken): CSSProperties | undefined => {
      if (types.length === 1 && types[0] === 'plain') {
        return empty ? {display: 'inline-block'} : undefined;
      }

      return Object.assign(
        empty ? {display: 'inline-block'} : {},
        ...types.map((type) => themeDictionary[type]),
      );
    },
    [themeDictionary],
  );

  return useCallback(
    ({
      token,
      className,
      style,
      ...rest
    }: TokenInputProps): TokenOutputProps => {
      const output: TokenOutputProps = {
        ...rest,
        className: clsx('token', ...token.types, className),
        children: token.content,
        style: styleForToken(token),
      };

      if (style != null) {
        output.style = {...output.style, ...style};
      }

      return output;
    },
    [styleForToken],
  );
}

function WdsCodeBlockContent({className: classNameProp}: Props): ReactNode {
  const {metadata, wordWrap} = useCodeBlockContext();
  const prismTheme = usePrismTheme();
  const {code, language, lineNumbersStart, lineClassNames} = metadata;
  const normalizedLanguage = language.toLowerCase();
  const themeDictionary = useMemo(
    () => themeToDictionary(prismTheme, normalizedLanguage),
    [normalizedLanguage, prismTheme],
  );
  const lines = useMemo(() => tokenizeWds(code), [code]);
  const getLineProps = useGetLineProps(themeDictionary);
  const getTokenProps = useGetTokenProps(themeDictionary);

  return (
    <Pre
      ref={wordWrap.codeBlockRef}
      className={clsx(
        classNameProp,
        `prism-code language-${normalizedLanguage}`,
      )}
      style={themeDictionary.root}>
      <Code>
        {lines.map((line, i) => (
          <Line
            key={i}
            line={line}
            getLineProps={getLineProps}
            getTokenProps={getTokenProps}
            classNames={lineClassNames[i]}
            showLineNumbers={lineNumbersStart !== undefined}
          />
        ))}
      </Code>
    </Pre>
  );
}

export default function CodeBlockContent(props: Props): ReactNode {
  const {metadata} = useCodeBlockContext();

  if (WDS_LANGUAGES.has(metadata.language.toLowerCase())) {
    return <WdsCodeBlockContent {...props} />;
  }

  return <OriginalContent {...props} />;
}
