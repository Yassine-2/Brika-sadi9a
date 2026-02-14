import { useState, useEffect } from 'react';
import { 
  Plus, 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  ArrowDownCircle, 
  ArrowUpCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { tasksAPI, productsAPI } from '../services/api';
import AddTaskModal from '../components/AddTaskModal';
import '../styles/tasks.css';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'ongoing', 'finished'
  const [expandedTask, setExpandedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [filter]);

  const loadProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      setProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const params = filter !== 'all' ? { state: filter } : {};
      const response = await tasksAPI.getAll(params);
      setTasks(response.data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = (taskId) => {
    setExpandedTask(expandedTask === taskId ? null : taskId);
  };

  const getTaskTypeIcon = (type) => {
    return type === 'in' ? (
      <ArrowDownCircle size={16} className="type-in" />
    ) : (
      <ArrowUpCircle size={16} className="type-out" />
    );
  };

  const handleCompleteItem = async (taskId, itemId) => {
    try {
      await tasksAPI.completeItem(taskId, itemId);
      loadTasks();
    } catch (error) {
      console.error('Error completing item:', error);
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.items) {
        for (const item of task.items) {
          if (item.state === 'ongoing') {
            await tasksAPI.completeItem(taskId, item.id);
          }
        }
      }
      loadTasks();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="tasks-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">Manage warehouse operations</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}>
          <Plus size={20} />
          New Task
        </button>
      </div>

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        products={products}
        onTaskCreated={loadTasks}
      />

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          <ClipboardList size={18} />
          All Tasks
        </button>
        <button
          className={`filter-tab ${filter === 'ongoing' ? 'active' : ''}`}
          onClick={() => setFilter('ongoing')}
        >
          <Clock size={18} />
          Ongoing
        </button>
        <button
          className={`filter-tab ${filter === 'finished' ? 'active' : ''}`}
          onClick={() => setFilter('finished')}
        >
          <CheckCircle2 size={18} />
          Finished
        </button>
      </div>

      {/* Tasks List */}
      <div className="tasks-list-container">
        {tasks.length === 0 ? (
          <div className="empty-state">
            <ClipboardList size={60} />
            <h3>No tasks found</h3>
            <p>
              {filter === 'all'
                ? 'Create your first task to get started'
                : `No ${filter} tasks at the moment`}
            </p>
          </div>
        ) : (
          <div className="tasks-accordion">
            {tasks.map(task => (
              <div key={task.id} className="task-card">
                <div 
                  className="task-header"
                  onClick={() => toggleTask(task.id)}
                >
                  <div className="task-expand">
                    {expandedTask === task.id ? (
                      <ChevronDown size={20} />
                    ) : (
                      <ChevronRight size={20} />
                    )}
                  </div>
                  <div className="task-title-section">
                    <h3 className="task-title">
                      {task.title || `Task #${task.id}`}
                    </h3>
                    {task.description && (
                      <p className="task-description">{task.description}</p>
                    )}
                  </div>
                  <div className="task-meta">
                    <span className="task-items-count">
                      {task.items?.length || 0} items
                    </span>
                    <span className={`task-state ${task.overall_state}`}>
                      {task.overall_state === 'ongoing' ? (
                        <>
                          <Clock size={14} />
                          Ongoing
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          Finished
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {expandedTask === task.id && (
                  <div className="task-body">
                    <div className="task-items">
                      <div className="items-header">
                        <span className="col-product">Product</span>
                        <span className="col-quantity">Quantity</span>
                        <span className="col-type">Type</span>
                        <span className="col-status">Status</span>
                        <span className="col-actions">Actions</span>
                      </div>
                      {task.items?.map(item => (
                        <div key={item.id} className="task-item-row">
                          <span className="col-product">
                            {item.product?.name || `Product #${item.product_id}`}
                          </span>
                          <span className="col-quantity">
                            {item.quantity_needed}
                          </span>
                          <span className="col-type">
                            {getTaskTypeIcon(item.task_type)}
                            {item.task_type === 'in' ? 'Incoming' : 'Outgoing'}
                          </span>
                          <span className={`col-status ${item.state}`}>
                            {item.state === 'ongoing' ? 'Pending' : 'Complete'}
                          </span>
                          <span className="col-actions">
                            {item.state === 'ongoing' && (
                              <button
                                className="btn btn-sm btn-ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCompleteItem(task.id, item.id);
                                }}
                              >
                                <CheckCircle2 size={14} />
                              </button>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="task-footer">
                      <span className="task-date">
                        Created: {new Date(task.created_at).toLocaleDateString()}
                      </span>
                      <div className="task-actions">
                        {task.overall_state === 'ongoing' && (
                          <button 
                            className="btn btn-secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCompleteTask(task.id);
                            }}
                          >
                            Mark Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;
