import { Link, Outlet, useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchEvent, deleteEvent } from "../../util/http";
import ErrorBlock from "../UI/ErrorBlock.jsx";
import Header from "../Header.jsx";
import LoadingIndicator from "../UI/LoadingIndicator.jsx";
import { useState } from "react";
import Modal from "../UI/Modal.jsx";

export default function EventDetails() {
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = useParams();
  const {
    data,
    isLoading: isTheEventLoading,
    isError: isTheEventError,
    error: theEventError,
  } = useQuery({
    queryKey: ["events", params.id],
    queryFn: ({ signal }) => fetchEvent({ id: params.id, signal }),
  });

  const {
    mutate,
    isPending: isPendingDeletion,
    isError: isDeletingError,
    error: deletingError,
  } = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["events"],
        refetchType: "none",
      });
      navigate("/events");
    },
  });

  function handleStartDeleting() {
    setIsDeleting(true);
  }

  function handleCancelDeleting() {
    setIsDeleting(false);
  }

  function handleDelete() {
    mutate({ id: params.id });
  }
  let content;
  if (isTheEventLoading) {
    content = (
      <div id="event-details-content" className="center">
        <LoadingIndicator />
      </div>
    );
  }
  if (isTheEventError) {
    content = (
      <div className="center">
        <ErrorBlock
          title="Failed to load event"
          message={theEventError.info?.message || "Failed to load event"}
        />
      </div>
    );
  }
  if (data) {
    const formattedDate = new Date(data.date).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    content = (
      <article id="event-details">
        <header>
          <h1>{data.title}</h1>
          <nav>
            <>
              <button onClick={handleStartDeleting}>Delete</button>
              <Link to="edit">Edit</Link>
            </>
          </nav>
        </header>
        <div id="event-details-content">
          <img src={`http://localhost:3000/${data.image}`} alt={data.title} />
          <div id="event-details-info">
            <div>
              <p id="event-details-location">{data.location}</p>
              <time dateTime={data.date}>
                {formattedDate} @ {data.time}
              </time>
            </div>
            <p id="event-details-description">{data.description}</p>
          </div>
        </div>
      </article>
    );
  }
  return (
    <>
      {isDeleting && (
        <Modal onClose={handleCancelDeleting}>
          <h2>Are you sure?</h2>
          <p>Are you sure you want to delete this event?</p>
          {isPendingDeletion && <p>Deleting...</p>}
          {!isPendingDeletion && (
            <div className="form-actions">
              <button onClick={handleCancelDeleting} className="button-text">
                Cancel
              </button>
              <button onClick={handleDelete} className="button">
                Delete
              </button>
            </div>
          )}
          {isDeletingError && (
            <ErrorBlock
              title="Something went wrong"
              message={deletingError.info?.message || "Failed to delete event"}
            />
          )}
        </Modal>
      )}
      <Outlet />
      <Header>
        <Link to="/events" className="nav-item">
          View all Events
        </Link>
      </Header>
      {content}
    </>
  );
}
