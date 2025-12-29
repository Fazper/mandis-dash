export default function PageTransition({ children }) {
    return (
        <div className="page-transition enter">
            {children}
        </div>
    );
}
