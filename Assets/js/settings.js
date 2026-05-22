document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('themeToggle');

    if (themeToggleBtn) {
        // Initialize explicit button wording based on the active state
        if (document.documentElement.classList.contains('dark')) {
            themeToggleBtn.textContent = 'Switch to Light Mode';
        } else {
            themeToggleBtn.textContent = 'Switch to Dark Mode';
        }

        // Click interaction handler
        themeToggleBtn.addEventListener('click', () => {
            // Toggle the 'dark' variant on html element
            document.documentElement.classList.toggle('dark');
            
            // Sync with local storage context strings
            if (document.documentElement.classList.contains('dark')) {
                localStorage.setItem('theme', 'dark');
                themeToggleBtn.textContent = 'Switch to Light Mode';
            } else {
                localStorage.setItem('theme', 'light');
                themeToggleBtn.textContent = 'Switch to Dark Mode';
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
            const menuBtn = document.getElementById('mobile-menu-btn');
            const sidebar = document.getElementById('sidebar');
            const backdrop = document.getElementById('sidebar-backdrop');

            if (menuBtn && sidebar && backdrop) {
                function toggleSidebar() {
                    sidebar.classList.toggle('-translate-x-full');
                    backdrop.classList.toggle('hidden');
                }

                menuBtn.addEventListener('click', toggleSidebar);
                backdrop.addEventListener('click', toggleSidebar);
            } else {
                console.error("Sidebar elements missing from DOM.");
            }
        });

