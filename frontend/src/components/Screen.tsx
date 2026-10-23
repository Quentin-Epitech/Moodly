import type { ReactNode, RefObject } from 'react';
import { ScrollView, View, type RefreshControlProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Width = 'narrow' | 'wide';

type Props = {
  children: ReactNode;
  /** true pour un écran qui peut dépasser la hauteur (ScrollView) */
  scroll?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  /** Largeur max du contenu sur grand écran (web, tablette) */
  width?: Width;
  /** Accès au ScrollView (défilement vers une section) */
  scrollRef?: RefObject<ScrollView | null>;
  /** Barre fixée en bas de l'écran (navigation par rôle) */
  footer?: ReactNode;
};

// Sur téléphone, pleine largeur ; sur grand écran, colonne centrée
const MAX_WIDTH: Record<Width, string> = {
  narrow: 'max-w-[560px]',
  wide: 'max-w-[1040px]',
};

// Fond blanc, marges latérales généreuses et zones sûres communs à tous les écrans
export function Screen({ children, scroll = false, refreshControl, width = 'narrow', scrollRef, footer }: Props) {
  const insets = useSafeAreaInsets();
  const padding = { paddingTop: insets.top + 8, paddingBottom: footer ? 32 : insets.bottom + 32 };

  const content = scroll ? (
    <ScrollView
      ref={scrollRef}
      className="flex-1 bg-bg"
      contentContainerClassName="items-center px-6"
      contentContainerStyle={padding}
      refreshControl={refreshControl}
      keyboardShouldPersistTaps="handled"
    >
      <View className={`w-full ${MAX_WIDTH[width]}`}>{children}</View>
    </ScrollView>
  ) : (
    <View className="flex-1 items-center bg-bg px-6" style={padding}>
      <View className={`w-full flex-1 ${MAX_WIDTH[width]}`}>{children}</View>
    </View>
  );

  if (!footer) return content;

  return (
    <View className="flex-1 bg-bg">
      {content}
      <View className="border-t border-line bg-bg" style={{ paddingBottom: insets.bottom }}>
        {footer}
      </View>
    </View>
  );
}
