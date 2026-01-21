/**
 * Script to add language switcher to all pages
 * Run this to update all HTML files
 */

// This is a reference script - actual implementation is in each HTML file

// Add to navigation bar in all pages:
/*
<div style="display: flex; gap: 5px; background: #f3f4f6; padding: 4px; border-radius: 8px; margin-right: 15px;">
    <button onclick="setLanguage('nl')" id="lang-btn-nl" style="padding: 6px 12px; border: none; background: transparent; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600;" class="lang-btn active">🇳🇱 NL</button>
    <button onclick="setLanguage('en')" id="lang-btn-en" style="padding: 6px 12px; border: none; background: transparent; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600;" class="lang-btn">🇬🇧 EN</button>
</div>
*/

// Add script to all pages:
/*
<script src="js/i18n.js"></script>
<script>
    function setLanguage(lang) {
        i18n.setLanguage(lang);
        updateLanguageButtons();
    }
    
    function updateLanguageButtons() {
        const currentLang = i18n.getLanguage();
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`lang-btn-${currentLang}`)?.classList.add('active');
    }
    
    document.addEventListener('DOMContentLoaded', () => {
        const savedLang = localStorage.getItem('zuidplas_language') || 'nl';
        i18n.setLanguage(savedLang);
        updateLanguageButtons();
    });
</script>
*/

