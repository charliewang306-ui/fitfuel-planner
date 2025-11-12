import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "@/i18n/config";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const handleLanguageChange = (langCode: string) => {
    if (langCode === 'system') {
      // Detect system language
      const browserLang = navigator.language || navigator.languages[0];
      const systemLang = browserLang.startsWith('zh-') 
        ? (browserLang.includes('TW') || browserLang.includes('HK') ? 'zh-TW' : 'zh-CN')
        : browserLang.split('-')[0];
      i18n.changeLanguage(systemLang);
      localStorage.removeItem('fitfuel-language'); // Remove saved preference to follow system
    } else {
      i18n.changeLanguage(langCode);
      localStorage.setItem('fitfuel-language', langCode);
    }
  };

  const currentLang = SUPPORTED_LANGUAGES.find(lang => lang.code === i18n.language) || SUPPORTED_LANGUAGES[1];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="button-language-switcher">
          <Globe className="h-5 w-5" />
          <span className="sr-only">Switch Language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={i18n.language === lang.code ? 'bg-accent' : ''}
            data-testid={`menu-item-lang-${lang.code}`}
          >
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
