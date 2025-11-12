import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Save, Moon, Sun, TrendingUp, ChevronRight, Sparkles, Crown, Mail, FileText, Shield, RotateCcw, Languages, ChevronDown, LogOut } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import type { UserProfile } from "@shared/schema";
import { useSubscription } from "@/hooks/use-subscription";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "@/i18n/config";
import { supabase } from "@/lib/supabaseClient";

export default function Settings() {
  const { t, i18n } = useTranslation(['settings', 'common']);
  const { toast } = useToast();
  const { isPro, status } = useSubscription();
  const [, setLocation] = useLocation();
  const [isDark, setIsDark] = useState(false);
  const [weightLb, setWeightLb] = useState('160');
  const [heightCm, setHeightCm] = useState('170');
  const [age, setAge] = useState('30');
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [goal, setGoal] = useState('maintain');
  const [activity, setActivity] = useState('moderate');
  const [unitPref, setUnitPref] = useState('g');
  const [decimalPlaces, setDecimalPlaces] = useState('1');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [sleepTime, setSleepTime] = useState('23:00');
  const [snacksCount, setSnacksCount] = useState('0');
  const [waterIntervalHours, setWaterIntervalHours] = useState('2.5');
  const [quietPeriodEnabled, setQuietPeriodEnabled] = useState(false);
  const [autoCompletionEnabled, setAutoCompletionEnabled] = useState(false);
  
  // Advanced streak control settings
  const [strictMode, setStrictMode] = useState(false);
  const [waterMustMeet, setWaterMustMeet] = useState(false);
  const [kcalWindow, setKcalWindow] = useState('0.10');
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || 'system');
  
  // Sleep-aware meal scheduling settings
  const [preSleepCutoffHours, setPreSleepCutoffHours] = useState('2.5');
  const [nightModeBufferMin, setNightModeBufferMin] = useState('90');
  const [lastReminderBufferMin, setLastReminderBufferMin] = useState('60');
  const [allowLightProteinAfterCutoff, setAllowLightProteinAfterCutoff] = useState(true);
  const [autoRescheduleMeals, setAutoRescheduleMeals] = useState(true);
  const [minGapBetweenMealsMin, setMinGapBetweenMealsMin] = useState('120');
  
  // Water intake settings (Imperial-first)
  const [waterGoalOverrideOz, setWaterGoalOverrideOz] = useState('');
  const [waterRemindersPerDay, setWaterRemindersPerDay] = useState('8');
  const [todayExerciseMinutes, setTodayExerciseMinutes] = useState('0');

  // Load user profile
  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['/api/profile']
  });

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setWeightLb(profile.weightLb.toString());
      setHeightCm(profile.heightCm?.toString() || '170');
      setAge(profile.age?.toString() || '30');
      setSex(profile.sex || 'male');
      setGoal(profile.goal);
      setActivity(profile.activity);
      setUnitPref(profile.unitPref);
      setDecimalPlaces(profile.decimalPlaces.toString());
      setWakeTime(profile.wakeTime);
      setSleepTime(profile.sleepTime);
      setSnacksCount((profile.snacksCount ?? 0).toString());
      setWaterIntervalHours((profile.waterIntervalHours ?? 2.5).toString());
      setQuietPeriodEnabled(profile.quietPeriodEnabled ?? false);
      setAutoCompletionEnabled(profile.autoCompletionEnabled ?? false);
      
      // Advanced streak control settings
      setStrictMode(profile.strictMode ?? false);
      setWaterMustMeet(profile.waterMustMeet ?? false);
      // Ensure kcalWindow matches select options exactly
      const kcalWindowValue = profile.kcalWindow ?? 0.10;
      setKcalWindow(kcalWindowValue.toFixed(2));
      
      // Sleep-aware meal scheduling settings
      setPreSleepCutoffHours((profile.preSleepCutoffHours ?? 2.5).toString());
      setNightModeBufferMin((profile.nightModeBufferMin ?? 90).toString());
      setLastReminderBufferMin((profile.lastReminderBufferMin ?? 60).toString());
      setAllowLightProteinAfterCutoff(profile.allowLightProteinAfterCutoff ?? true);
      setAutoRescheduleMeals(profile.autoRescheduleMeals ?? true);
      setMinGapBetweenMealsMin((profile.minGapBetweenMealsMin ?? 120).toString());
      
      // Water intake settings
      setWaterGoalOverrideOz(profile.waterGoalOverrideOz?.toString() || '');
      setWaterRemindersPerDay((profile.waterRemindersPerDay ?? 8).toString());
      setTodayExerciseMinutes((profile.todayExerciseMinutes ?? 0).toString());
    }
  }, [profile]);

  // Save settings handler with validation
  const handleSave = () => {
    // Validate inputs before saving
    const weightValue = parseFloat(weightLb);
    const heightValue = parseFloat(heightCm);
    const ageValue = parseInt(age);
    const decimalValue = parseInt(decimalPlaces);
    
    if (isNaN(weightValue) || weightValue <= 0) {
      toast({
        title: t('settings:saveError'),
        description: t('settings:invalidWeight'),
        variant: 'destructive'
      });
      return;
    }
    
    if (isNaN(heightValue) || heightValue < 120 || heightValue > 220) {
      toast({
        title: t('settings:saveError'),
        description: t('settings:invalidHeight'),
        variant: 'destructive'
      });
      return;
    }
    
    if (isNaN(ageValue) || ageValue < 15 || ageValue > 100) {
      toast({
        title: t('settings:saveError'),
        description: t('settings:invalidAge'),
        variant: 'destructive'
      });
      return;
    }
    
    if (isNaN(decimalValue)) {
      toast({
        title: t('settings:saveError'),
        description: t('settings:invalidDecimal'),
        variant: 'destructive'
      });
      return;
    }
    
    // All validation passed, proceed with save
    saveMutation.mutate({
      weightValue,
      heightValue,
      ageValue,
      decimalValue
    });
  };

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { weightValue: number; heightValue: number; ageValue: number; decimalValue: number }) => {
      const res = await apiRequest('POST', '/api/profile', {
        weightLb: data.weightValue,
        heightCm: data.heightValue,
        age: data.ageValue,
        sex,
        goal,
        activity,
        unitPref,
        decimalPlaces: data.decimalValue,
        wakeTime,
        sleepTime,
        snacksCount: parseInt(snacksCount) || 0,
        waterIntervalHours: parseFloat(waterIntervalHours) || 2.5,
        quietPeriodEnabled,
        autoCompletionEnabled,
        strictMode,
        waterMustMeet,
        kcalWindow: parseFloat(kcalWindow) || 0.10,
        // Sleep-aware meal scheduling settings
        preSleepCutoffHours: parseFloat(preSleepCutoffHours) || 2.5,
        nightModeBufferMin: parseInt(nightModeBufferMin) || 90,
        lastReminderBufferMin: parseInt(lastReminderBufferMin) || 60,
        allowLightProteinAfterCutoff,
        autoRescheduleMeals,
        minGapBetweenMealsMin: parseInt(minGapBetweenMealsMin) || 120,
        // Water intake settings
        waterGoalOverrideOz: waterGoalOverrideOz ? parseFloat(waterGoalOverrideOz) : null,
        waterRemindersPerDay: parseInt(waterRemindersPerDay) || 8,
        todayExerciseMinutes: parseInt(todayExerciseMinutes) || 0
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/targets/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/summary/today'] });
      toast({
        title: t('settings:saved'),
        description: t('settings:savedDesc')
      });
    },
    onError: () => {
      toast({
        title: t('settings:saveError'),
        description: t('settings:saveErrorDesc'),
        variant: 'destructive'
      });
    }
  });

  const toggleDarkMode = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    if (lang === 'system') {
      // Use browser's language or fallback to English
      const browserLang = navigator.language;
      const supportedLang = SUPPORTED_LANGUAGES.find(l => browserLang.startsWith(l.code) && l.code !== 'system');
      i18n.changeLanguage(supportedLang?.code || 'en');
      localStorage.removeItem('fitfuel-language');
    } else {
      i18n.changeLanguage(lang);
    }
    // Note: React Query automatically refetches when query keys change (they include i18n.language)
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Clear all local storage
      localStorage.clear();
      // Clear React Query cache
      queryClient.clear();
      // Show success message
      toast({
        title: t('settings:logoutSuccess'),
        description: t('settings:logoutSuccessDesc')
      });
      // Redirect to login page
      setLocation('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: t('settings:logoutError'),
        description: t('settings:logoutErrorDesc'),
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-xl font-semibold text-foreground">{t('settings:title')}</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            data-testid="button-toggle-theme"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 space-y-6">
        {/* Subscription Status */}
        <Link href="/upgrade-pro">
          <Card className={`cursor-pointer transition-all hover-elevate active-elevate-2 ${isPro ? 'border-primary/20 bg-primary/5' : 'border-border'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isPro ? (
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                      <Crown className="w-5 h-5 text-primary" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                      <Sparkles className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      {isPro ? 'FitFuel Planner PRO' : t('settings:upgradeToPro')}
                      {isPro && <Badge variant="default" className="text-xs">{t('settings:proPlan')}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isPro ? (status === 'trialing' ? t('settings:freePlan') : t('settings:managePlan')) : t('settings:upgradeToPro')}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
        
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('settings:profile')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="weight">{t('settings:weight')} ({t('settings:weightUnit')})</Label>
              <Input
                id="weight"
                type="number"
                value={weightLb}
                onChange={(e) => setWeightLb(e.target.value)}
                placeholder="160"
                data-testid="input-weight"
              />
              <p className="text-xs text-muted-foreground">
                ≈ {(parseFloat(weightLb) * 0.453592).toFixed(1)} kg
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="height">{t('settings:height')} ({t('settings:heightUnit')})</Label>
              <Input
                id="height"
                type="number"
                min="120"
                max="220"
                step="0.1"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="170"
                data-testid="input-height"
              />
              <p className="text-xs text-muted-foreground">
                ≈ {(parseFloat(heightCm) / 2.54).toFixed(1)} in • {t('settings:bmi')}: {(parseFloat(weightLb) * 0.453592 / Math.pow(parseFloat(heightCm) / 100, 2)).toFixed(1)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">{t('settings:age')}</Label>
              <Input
                id="age"
                type="number"
                min="15"
                max="100"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="25"
                data-testid="input-age"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sex">{t('settings:sex')}</Label>
              <Select value={sex} onValueChange={(v: 'male' | 'female') => setSex(v)}>
                <SelectTrigger id="sex" data-testid="select-sex">
                  <SelectValue placeholder={sex === 'male' ? t('settings:sexOptions.male') : t('settings:sexOptions.female')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t('settings:sexOptions.male')}</SelectItem>
                  <SelectItem value="female">{t('settings:sexOptions.female')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('settings:sexNote')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal">{t('settings:goal')}</Label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger id="goal" data-testid="select-goal">
                  <SelectValue placeholder={t(`common:goals.${goal}`)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cut">{t('common:goals.cut')}</SelectItem>
                  <SelectItem value="maintain">{t('common:goals.maintain')}</SelectItem>
                  <SelectItem value="bulk">{t('common:goals.bulk')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity">{t('settings:activityLevel')}</Label>
              <Select value={activity} onValueChange={setActivity}>
                <SelectTrigger id="activity" data-testid="select-activity">
                  <SelectValue placeholder={
                    activity === 'sedentary' ? t('settings:activity.sedentary') :
                    activity === 'light' ? t('settings:activity.light') :
                    activity === 'moderate' ? t('settings:activity.moderate') :
                    activity === 'active' ? t('settings:activity.active') :
                    t('settings:activity.veryActive')
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">{t('settings:activity.sedentary')}</SelectItem>
                  <SelectItem value="light">{t('settings:activity.light')}</SelectItem>
                  <SelectItem value="moderate">{t('settings:activity.moderate')}</SelectItem>
                  <SelectItem value="active">{t('settings:activity.active')}</SelectItem>
                  <SelectItem value="very_active">{t('settings:activity.veryActive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Display Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('settings:preferences')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="language" className="flex items-center gap-2">
                <Languages className="w-4 h-4" />
                {t('settings:language')}
              </Label>
              <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                <SelectTrigger id="language" data-testid="select-language">
                  <SelectValue placeholder={SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || selectedLanguage} />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">{t('settings:units')}</Label>
              <Select value={unitPref} onValueChange={setUnitPref}>
                <SelectTrigger id="unit" data-testid="select-unit-pref">
                  <SelectValue placeholder={t(`settings:unitSystem.${unitPref}`)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="g">{t('settings:unitSystem.g')}</SelectItem>
                  <SelectItem value="oz">{t('settings:unitSystem.oz')}</SelectItem>
                  <SelectItem value="kg">{t('settings:unitSystem.kg')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="decimals">{t('settings:decimalPlaces')}</Label>
              <Select value={decimalPlaces} onValueChange={setDecimalPlaces}>
                <SelectTrigger id="decimals" data-testid="select-decimals">
                  <SelectValue placeholder={decimalPlaces} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>{t('settings:darkMode')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('settings:theme')}
                </p>
              </div>
              <Switch
                checked={isDark}
                onCheckedChange={toggleDarkMode}
                data-testid="switch-dark-mode"
              />
            </div>
          </CardContent>
        </Card>

        {/* Schedule Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('settings:schedule')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wake-time">{t('settings:wakeTime')}</Label>
              <Input
                id="wake-time"
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                data-testid="input-wake-time"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sleep-time">{t('settings:sleepTime')}</Label>
              <Input
                id="sleep-time"
                type="time"
                value={sleepTime}
                onChange={(e) => setSleepTime(e.target.value)}
                data-testid="input-sleep-time"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="snacks-count">{t('settings:snacksCount', 'Daily Snacks')}</Label>
              <Select value={snacksCount} onValueChange={setSnacksCount}>
                <SelectTrigger id="snacks-count" data-testid="select-snacks-count">
                  <SelectValue placeholder={t(`settings:snacksOptions.${snacksCount}`, snacksCount)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{t('settings:snacksOptions.0', 'No snacks')}</SelectItem>
                  <SelectItem value="1">{t('settings:snacksOptions.1', '1 snack')}</SelectItem>
                  <SelectItem value="2">{t('settings:snacksOptions.2', '2 snacks')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('settings:snacksNote', 'Additional meals between breakfast, lunch, and dinner')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="water-interval">{t('settings:waterInterval', 'Water Reminder Interval')}</Label>
              <Select value={waterIntervalHours} onValueChange={setWaterIntervalHours}>
                <SelectTrigger id="water-interval" data-testid="select-water-interval">
                  <SelectValue placeholder={t(`settings:waterIntervalOptions.${waterIntervalHours}`, waterIntervalHours)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">{t('settings:waterIntervalOptions.2', 'Every 2 hours')}</SelectItem>
                  <SelectItem value="2.5">{t('settings:waterIntervalOptions.2.5', 'Every 2.5 hours')}</SelectItem>
                  <SelectItem value="3">{t('settings:waterIntervalOptions.3', 'Every 3 hours')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('settings:waterIntervalNote', 'How often to remind you to drink water')}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="quiet-period">{t('settings:quietPeriod', 'Quiet Period')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('settings:quietPeriodNote', 'Silence reminders 30min before wake/sleep times')}
                </p>
              </div>
              <Switch
                id="quiet-period"
                checked={quietPeriodEnabled}
                onCheckedChange={setQuietPeriodEnabled}
                data-testid="switch-quiet-period"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-completion">{t('settings:autoCompletion')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('settings:autoCompletionNote')}
                </p>
              </div>
              <Switch
                id="auto-completion"
                checked={autoCompletionEnabled}
                onCheckedChange={setAutoCompletionEnabled}
                data-testid="switch-auto-completion"
              />
            </div>
          </CardContent>
        </Card>

        {/* Water Intake Settings (Imperial-first) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('settings:waterIntakeGoals')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="water-goal-override">{t('settings:waterGoalOverride')}</Label>
              <Input
                id="water-goal-override"
                type="number"
                min="40"
                max="200"
                step="4"
                value={waterGoalOverrideOz}
                onChange={(e) => setWaterGoalOverrideOz(e.target.value)}
                placeholder={t('settings:waterGoalPlaceholder')}
                data-testid="input-water-goal-override"
              />
              <p className="text-xs text-muted-foreground">
                {waterGoalOverrideOz 
                  ? t('settings:waterGoalCustom', { amount: waterGoalOverrideOz, ml: Math.round(parseFloat(waterGoalOverrideOz) * 29.5735) })
                  : t('settings:waterGoalAuto', { oz: Math.round(parseFloat(weightLb) * 0.6), ml: Math.round(parseFloat(weightLb) * 0.6 * 29.5735), weight: weightLb })
                }
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="water-reminders-per-day">{t('settings:waterRemindersPerDay')}</Label>
              <Select value={waterRemindersPerDay} onValueChange={setWaterRemindersPerDay}>
                <SelectTrigger id="water-reminders-per-day" data-testid="select-water-reminders">
                  <SelectValue placeholder={waterRemindersPerDay === '8' ? t('settings:waterRemindersRecommended', { count: 8 }) : t('settings:waterRemindersCount', { count: parseInt(waterRemindersPerDay) })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">{t('settings:waterRemindersCount', { count: 6 })}</SelectItem>
                  <SelectItem value="7">{t('settings:waterRemindersCount', { count: 7 })}</SelectItem>
                  <SelectItem value="8">{t('settings:waterRemindersRecommended', { count: 8 })}</SelectItem>
                  <SelectItem value="9">{t('settings:waterRemindersCount', { count: 9 })}</SelectItem>
                  <SelectItem value="10">{t('settings:waterRemindersCount', { count: 10 })}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('settings:waterRemindersNote')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="today-exercise-minutes">{t('settings:todayExerciseMinutes')}</Label>
              <Input
                id="today-exercise-minutes"
                type="number"
                min="0"
                max="300"
                step="5"
                value={todayExerciseMinutes}
                onChange={(e) => setTodayExerciseMinutes(e.target.value)}
                placeholder="0"
                data-testid="input-exercise-minutes"
              />
              <p className="text-xs text-muted-foreground">
                {t('settings:exerciseBonus')}
                {parseInt(todayExerciseMinutes) > 0 && ` • ${t('settings:todayExtraWater', { amount: Math.round((parseInt(todayExerciseMinutes) >= 60 ? 24 : 12 * (parseInt(todayExerciseMinutes) / 30))) })}`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sleep-aware Meal Scheduling Settings (Collapsible) */}
        <Collapsible defaultOpen={false}>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex flex-col items-start space-y-1">
                  <CardTitle className="text-base">{t('settings:sleepAndMealWindow')}</CardTitle>
                  <p className="text-xs text-muted-foreground">{t('settings:sleepAndMealWindowDesc')}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="pre-sleep-cutoff">{t('settings:preSleepCutoff')}</Label>
                  <Input
                    id="pre-sleep-cutoff"
                    type="number"
                    step="0.5"
                    min="2"
                    max="4"
                    value={preSleepCutoffHours}
                    onChange={(e) => setPreSleepCutoffHours(e.target.value)}
                    className="max-w-[200px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('settings:preSleepCutoffNote')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="night-mode-buffer">{t('settings:nightModeBuffer')}</Label>
                  <Input
                    id="night-mode-buffer"
                    type="number"
                    step="15"
                    min="60"
                    max="180"
                    value={nightModeBufferMin}
                    onChange={(e) => setNightModeBufferMin(e.target.value)}
                    className="max-w-[200px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('settings:nightModeBufferNote')}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="allow-light-protein">{t('settings:allowLightProtein')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('settings:allowLightProteinNote')}
                    </p>
                  </div>
                  <Switch
                    id="allow-light-protein"
                    checked={allowLightProteinAfterCutoff}
                    onCheckedChange={setAllowLightProteinAfterCutoff}
                    data-testid="switch-allow-light-protein"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-reschedule">{t('settings:autoRescheduleMeals')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('settings:autoRescheduleMealsNote')}
                    </p>
                  </div>
                  <Switch
                    id="auto-reschedule"
                    checked={autoRescheduleMeals}
                    onCheckedChange={setAutoRescheduleMeals}
                    data-testid="switch-auto-reschedule"
                  />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Advanced Streak Control Settings (Collapsible) */}
        <Collapsible defaultOpen={false}>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex flex-col items-start space-y-1">
                  <CardTitle className="text-base">{t('settings:advancedControl')}</CardTitle>
                  <p className="text-xs text-muted-foreground">{t('settings:advancedControlDesc')}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="strict-mode">{t('settings:strictMode')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('settings:strictModeNote')}
                    </p>
                  </div>
                  <Switch
                    id="strict-mode"
                    checked={strictMode}
                    onCheckedChange={setStrictMode}
                    data-testid="switch-strict-mode"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="water-must-meet">{t('settings:waterMustMeet')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('settings:waterMustMeetNote')}
                    </p>
                  </div>
                  <Switch
                    id="water-must-meet"
                    checked={waterMustMeet}
                    onCheckedChange={setWaterMustMeet}
                    data-testid="switch-water-must-meet"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kcal-window">{t('settings:kcalWindow')}</Label>
                  <Select value={kcalWindow} onValueChange={setKcalWindow}>
                    <SelectTrigger id="kcal-window" data-testid="select-kcal-window">
                      <SelectValue placeholder={
                        kcalWindow === '0.08' ? t('settings:kcalWindow8') :
                        kcalWindow === '0.10' ? t('settings:kcalWindow10') :
                        t('settings:kcalWindow12')
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.08">{t('settings:kcalWindow8')}</SelectItem>
                      <SelectItem value="0.10">{t('settings:kcalWindow10')}</SelectItem>
                      <SelectItem value="0.12">{t('settings:kcalWindow12')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t('settings:kcalWindowNote')}
                  </p>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Save Button */}
        <Button 
          className="w-full h-12" 
          size="lg" 
          data-testid="button-save-settings"
          onClick={handleSave}
          disabled={saveMutation.isPending || isLoading}
        >
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? t('settings:saving') : t('settings:saveSettings')}
        </Button>

        {/* Support & Legal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('settings:support')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/contact">
              <Button
                variant="ghost"
                className="w-full justify-start h-12"
                data-testid="button-contact-support"
              >
                <Mail className="w-4 h-4 mr-3 text-muted-foreground" />
                <span>{t('settings:contactSupport')}</span>
              </Button>
            </Link>
            
            <Link href="/privacy">
              <Button
                variant="ghost"
                className="w-full justify-start h-12"
                data-testid="link-privacy-policy"
              >
                <Shield className="w-4 h-4 mr-3 text-muted-foreground" />
                <span>{t('settings:privacyPolicy')}</span>
              </Button>
            </Link>
            
            <Link href="/terms">
              <Button
                variant="ghost"
                className="w-full justify-start h-12"
                data-testid="link-terms-of-service"
              >
                <FileText className="w-4 h-4 mr-3 text-muted-foreground" />
                <span>{t('settings:termsOfService')}</span>
              </Button>
            </Link>
            
            <Link href="/upgrade-pro">
              <Button
                variant="ghost"
                className="w-full justify-start h-12"
                data-testid="button-restore-purchases"
              >
                <RotateCcw className="w-4 h-4 mr-3 text-muted-foreground" />
                <span>{t('settings:restorePurchases')}</span>
              </Button>
            </Link>
            
            <Button
              variant="ghost"
              className="w-full justify-start h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-3" />
              <span>{t('settings:logout')}</span>
            </Button>
          </CardContent>
        </Card>

        {/* App Info */}
        <div className="text-center text-xs text-muted-foreground pt-4 space-y-1">
          <p>{t('common:app.name')} - {t('common:app.tagline')}</p>
          <p>{t('settings:version', { version: '1.0.0' })}</p>
        </div>
      </main>
    </div>
  );
}
