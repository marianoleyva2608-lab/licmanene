document.addEventListener('DOMContentLoaded', () => {
    // Scroll Reveal Animation for different directions
    const reveals = document.querySelectorAll('.reveal-top, .reveal-left, .reveal-bottom, .reveal-right');
    
    const revealOnScroll = () => {
        reveals.forEach(el => {
            const windowHeight = window.innerHeight;
            const elementTop = el.getBoundingClientRect().top;
            const elementVisible = 100;
            
            if (elementTop < windowHeight - elementVisible) {
                el.classList.add('active');
            }
        });
    };

    window.addEventListener('scroll', revealOnScroll);
    
    // Trigger once on load with a small delay for better feel
    setTimeout(revealOnScroll, 100);

    // Smooth Scrolling for nav links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if(targetId.startsWith('#')) {
                e.preventDefault();
                const targetElement = document.querySelector(targetId);
                if(targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // Header Background Change on Scroll
    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.background = 'rgba(10, 10, 10, 0.95)';
            header.style.backdropFilter = 'blur(10px)';
            header.style.paddingTop = '10px';
            header.style.height = '80px';
            header.style.borderBottom = '1px solid rgba(197, 160, 125, 0.1)';
        } else {
            header.style.background = 'transparent';
            header.style.backdropFilter = 'none';
            header.style.paddingTop = '20px';
            header.style.height = '100px';
            header.style.borderBottom = 'none';
        }
    });
});
