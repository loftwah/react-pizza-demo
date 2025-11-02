type FormatListPreviewOptions = {
  limit?: number;
  joiner?: string;
  overflowLabel?: (count: number) => string;
};

export const formatListPreview = (
  items: string[],
  options: FormatListPreviewOptions = {},
): string => {
  const {
    limit = 3,
    joiner = ', ',
    overflowLabel = (count: number) => `+${count} more`,
  } = options;
  const cleaned = items
    .map((item) => item.trim())
    .filter((item): item is string => item.length > 0);

  if (cleaned.length === 0) {
    return '';
  }

  if (cleaned.length <= limit) {
    return cleaned.join(joiner);
  }

  const remaining = cleaned.length - limit;
  const visible = cleaned.slice(0, limit).join(joiner);
  return `${visible}${joiner}${overflowLabel(remaining)}`;
};
