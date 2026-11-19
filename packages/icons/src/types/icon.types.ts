export interface IconEntity {
  readonly offset: number
  readonly length: number
}

export interface IconDetail<K extends string = string> {
  readonly key: K
  readonly customEmojiId: string
  readonly fallback: string
  readonly capturedAt?: string
  readonly entity?: IconEntity
  readonly sticker?: Readonly<Record<string, unknown>>
  readonly receivedMessage?: Readonly<Record<string, unknown>>
}

export interface Icon<K extends string = string> extends IconDetail<K> {
  readonly html: string
  toString(): string
}

export type IconInput<K extends string = string> = K | IconDetail

export type KeyedIconRecord<T extends Record<string, IconDetail>> = T & {
  readonly [K in keyof T]: IconDetail<Extract<K, string>>
}

export interface IconCallbackButton {
  text: string
  callback_data: string
  icon_custom_emoji_id?: string
}

export interface IconUrlButton {
  text: string
  url: string
  icon_custom_emoji_id?: string
}

export interface IconRegistry<TKeys extends string = string> {
  readonly icons: { readonly [K in TKeys]: Icon<K> }
  findIcon(key: string): Icon | undefined
  getIcon<K extends TKeys>(key: K): Icon<K>
  renderIcon(icon: IconInput<TKeys>): string
  iconCallbackButton(
    icon: IconInput<TKeys> | undefined,
    text: string,
    callbackData?: string
  ): IconCallbackButton
  iconUrlButton(
    icon: IconInput<TKeys> | undefined,
    text: string,
    url: string
  ): IconUrlButton
}
