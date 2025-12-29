import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function PageTransition({ children }) {
    const location = useLocation();
    const [displayChildren, setDisplayChildren] = useState(children);
    const [transitionStage, setTransitionStage] = useState('enter');

    useEffect(() => {
        if (children !== displayChildren) {
            setTransitionStage('exit');
        }
    }, [children, displayChildren]);

    const handleAnimationEnd = () => {
        if (transitionStage === 'exit') {
            setDisplayChildren(children);
            setTransitionStage('enter');
        }
    };

    return (
        <div
            className={`page-transition ${transitionStage}`}
            onAnimationEnd={handleAnimationEnd}
            key={location.pathname}
        >
            {transitionStage === 'exit' ? displayChildren : children}
        </div>
    );
}
