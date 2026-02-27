import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { jobsApi } from '../api';
import type { IJob } from '../types';
import JobDetails from '../components/JobDetails';

export default function JobDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<IJob | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJob = async () => {
      if (!id) {
        navigate('/');
        return;
      }

      setLoading(true);
      try {
        const response = await jobsApi.getJobById(id);
        setJob(response.data);
      } catch (error) {
        console.error('Error fetching job details:', error);
        toast.error('Failed to load job details.');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [id, navigate]);

  const handleClose = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  return <JobDetails job={job} onClose={handleClose} />;
}
