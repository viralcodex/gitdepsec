const Banner = () => {
  return (
    <section className="sm:mb-5 mt-5 mb-2 relative" role="banner" aria-label="Hero section">
      {/* Background SVG for large screens, hidden on small screens */}
      <div className="relative flex flex-col items-center justify-evenly space-y-4 px-4 sm:px-0">
        <div className="relative z-10 text-center">
          <h1 className="sm:text-6xl text-[40px] font-bold leading-10 tracking-tighter text-yellow-300">
            Scan and Secure your <em className="font-black tracking-light">Deps</em> !
          </h1>
        </div>
        <div className="mx-auto max-w-4xl text-center">
          <p className="sm:mt-5 text-md ">
            Visualise, detect and fix dependency vulnerabilities of your codebase in one click.{" "}
            <br /> Free & Open Source!
          </p>
        </div>
      </div>
    </section>
  );
};

export default Banner;
