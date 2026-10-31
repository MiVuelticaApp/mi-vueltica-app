import { forwardRef, useImperativeHandle, useRef, type ComponentRef } from 'react';
import { TextInput as RNTextInput, View, type KeyboardTypeOptions } from 'react-native';
import { useAppTheme } from '@/theme/useAppTheme';
import { textStyle } from '@/theme/typography';

export interface TextFieldHandle {
  clear: () => void;
  focus: () => void;
}

interface Props {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  testID?: string;
  accessibilityLabel: string;
  keyboardType?: KeyboardTypeOptions;
  autoFocus?: boolean;
  maxLength?: number;
  onSubmitEditing?: () => void;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  returnKeyType?: 'done' | 'go' | 'search' | 'send';
}

/**
 * Text input. Uses the platform TextInput (native control) styled to the design; the universal @expo/ui
 * TextInput holds its value in native state which does not suit controlled forms (see IMPLEMENTATION_NOTES).
 */
export const TextField = forwardRef<TextFieldHandle, Props>(function TextField(
  { value, onChangeText, placeholder, multiline, rows, testID, accessibilityLabel, keyboardType, autoFocus, maxLength, onSubmitEditing, autoCapitalize, returnKeyType },
  ref,
) {
  const { c, fontScale } = useAppTheme();
  const inner = useRef<ComponentRef<typeof RNTextInput>>(null);
  useImperativeHandle(ref, () => ({ clear: () => onChangeText(''), focus: () => inner.current?.focus() }));
  return (
    <View>
      <RNTextInput
        ref={inner}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.labelSecondary}
        multiline={multiline}
        numberOfLines={multiline ? (rows ?? 4) : 1}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        maxLength={maxLength}
        onSubmitEditing={onSubmitEditing}
        autoCapitalize={autoCapitalize}
        returnKeyType={returnKeyType}
        allowFontScaling={false}
        selectionColor={c.primary}
        style={[textStyle('body', fontScale), { color: c.onSurface, minHeight: multiline ? 24 * (rows ?? 4) : 24, textAlignVertical: multiline ? 'top' : 'center', paddingVertical: 0, outlineStyle: 'none' } as object]}
      />
    </View>
  );
});
