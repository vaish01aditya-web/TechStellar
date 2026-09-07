import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginTranslations, scheduledLanguages } from '../i18n/loginTranslations';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem('lm_language') || 'en');
  const text = loginTranslations[language] || loginTranslations.en;
  const isRtl = language === 'ur' || language === 'ks' || language === 'sd';

  useEffect(() => {
    localStorage.setItem('lm_language', language);
    document.documentElement.lang = language;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  }, [isRtl, language]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || text.invalidCredentials);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-serif text-2xl text-ink">Legal Metrology</p>
          <p className="text-sm text-ink/60">{text.subtitle}</p>
        </div>
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label" htmlFor="language">{text.language}</label>
            <select
              id="language"
              className="input"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label={text.languagePrompt}
            >
              <option value="en">English</option>
              {scheduledLanguages.map((item) => (
                <option key={item.code} value={item.code}>{item.nativeName} ({item.name})</option>
              ))}
            </select>
          </div>
          <h1 className="font-serif text-xl">{text.signIn}</h1>
          {error && <p className="rounded-md bg-noncompliant-bg px-3 py-2 text-sm text-noncompliant">{error}</p>}
          <div>
            <label className="label" htmlFor="email">{text.email}</label>
            <input
              id="email"
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={text.emailPlaceholder}
            />
          </div>
          <div>
            <label className="label" htmlFor="password">{text.password}</label>
            <input
              id="password"
              type="password"
              required
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={text.passwordPlaceholder}
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? text.signingIn : text.signIn}
          </button>
          <p className="text-center text-sm text-ink/60">
            {text.noAccount} <Link to="/register" className="text-brass hover:underline">{text.register}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
