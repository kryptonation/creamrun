const GridShowingCount = ({ rows, total }) => {
  return (
    <p className="regular-text text-grey">
      Showing {rows < total ? rows : total} of {total} Lists...{" "}
    </p>
  );
};

export default GridShowingCount;
