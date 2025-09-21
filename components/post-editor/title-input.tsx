interface TitleInputProps {
  value: string;
  onChange: (value: string) => void;
  readonly?: boolean;
  placeholder?: string;
}

export function TitleInput({ value, onChange, readonly = false, placeholder }: TitleInputProps) {
  return (
    <div className="mb-4">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readonly}
        placeholder={placeholder}
        className="w-full border-0 outline-none focus:outline-none bg-transparent font-black tracking-tight text-2xl leading-8"
      />
    </div>
  );
}