import React, { useState, useEffect } from 'react';
import { database, ref, get, set, push, remove, update, onValue } from '../lib/firebase';
import { Employee, ClientPortalFile, ClientPortalFileVersion } from '../types';
import { ArrowLeft, Plus, Eye, Upload, Trash2, Download, Edit2, X, FileText, CheckCircle } from 'lucide-react';

interface Project {
  id: string;
  siteId: string;
  name: string;
  status: 'active' | 'in-progress' | 'completed' | 'on-hold';
  location: string;
  updates: string;
  updatedAt: string;
}

interface ClientPortalProps {
  clientName: string;
  onBack: () => void;
  currentEmployee?: Employee;
}

const ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/pdf', 'application/zip'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.xlsx', '.docx', '.pdf', '.zip'];


const clientIcons: Record<string, string> = {
  INDUS: '📡',
  JIO: '📱',
  AIRTEL: '📶',
  RAILWAYS: '🚆',
  SOLAR: '☀️',
  OTHERS: '🔹'
};

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'in-progress': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'on-hold': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
};

export default function ClientPortal({ clientName, onBack, currentEmployee }: ClientPortalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clientFiles, setClientFiles] = useState<ClientPortalFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [showFileUpload, setShowFileUpload] = useState<string | null>(null); // project ID
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ClientPortalFile | null>(null);

  const [newProject, setNewProject] = useState({
    siteId: '',
    name: '',
    status: 'active' as const,
    location: '',
    updates: ''
  });

  const [filesToUploadWithSite, setFilesToUploadWithSite] = useState<File[]>([]);
  const [siteFileDescriptions, setSiteFileDescriptions] = useState<Record<string, string>>({});

  const [fileUploadData, setFileUploadData] = useState({
    projectId: '',
    description: '',
    file: null as File | null
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const normalizeClientName = (value?: string) => value?.trim().toUpperCase();

  const hasSameClientAccess = () => {
    if (!currentEmployee) return false;
    const employeeClient = normalizeClientName(currentEmployee.client);
    const portalClient = normalizeClientName(clientName);
    return Boolean(employeeClient && portalClient && employeeClient !== 'NOT ASSIGNED' && employeeClient === portalClient);
  };

  const canManageFiles = () => {
    if (!currentEmployee || !hasSameClientAccess()) return false;
    const role = currentEmployee.role?.toLowerCase();
    return role === 'manager' || role === 'director' || role === 'md';
  };

  // Load projects
  useEffect(() => {
    const projectsRef = ref(database, `clients/${clientName}/projects`);
    
    const unsubscribe = onValue(projectsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const projectList = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setProjects(projectList);
      } else {
        setProjects([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [clientName]);

  // Load files
  useEffect(() => {
    const filesRef = ref(database, `clients/${clientName}/files`);
    
    const unsubscribe = onValue(filesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const fileList = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        } as ClientPortalFile));
        setClientFiles(fileList);
      } else {
        setClientFiles([]);
      }
    });

    return () => unsubscribe();
  }, [clientName]);

  const addProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const projectsRef = ref(database, `clients/${clientName}/projects`);
    await push(projectsRef, {
      ...newProject,
      updatedAt: new Date().toISOString()
    });

    // Upload files associated with this site
    if (filesToUploadWithSite.length > 0 && currentEmployee) {
      const filesRef = ref(database, `clients/${clientName}/files`);
      
      for (const file of filesToUploadWithSite) {
        try {
          const reader = new FileReader();
          reader.onload = async (event) => {
            const fileData = event.target?.result as string;
            const newFile: ClientPortalFile = {
              id: `file-${Date.now()}-${Math.random()}`,
              fileId: `file-${Date.now()}-${Math.random()}`,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              fileData: fileData,
              siteId: newProject.siteId,
              description: siteFileDescriptions[file.name] || '',
              uploadedBy: currentEmployee.id,
              uploadedByName: currentEmployee.name,
              uploadedAt: new Date().toISOString(),
              clientName: clientName,
              versions: []
            };

            const newFileRef = ref(database, `clients/${clientName}/files/${newFile.id}`);
            await set(newFileRef, newFile);
          };
          reader.readAsDataURL(file);
        } catch (error) {
          console.error('Error uploading file:', error);
        }
      }
    }

    setNewProject({
      siteId: '',
      name: '',
      status: 'active',
      location: '',
      updates: ''
    });
    setFilesToUploadWithSite([]);
    setSiteFileDescriptions({});
    setShowAddForm(false);
    alert('Site created successfully! Files will be uploaded in the background.');
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm('Delete this site permanently? This action cannot be undone.')) return;
    const projectRef = ref(database, `clients/${clientName}/projects/${projectId}`);
    await remove(projectRef);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const file = e.target.files[0];
    
    if (file) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_FORMATS.includes(file.type)) {
        alert('Invalid file format. Allowed: JPG, PNG, EXCEL, WORD, PDF, ZIP');
        return;
      }
      if (file.size > 5000 * 1024 * 1024) { // 5000MB limit
        alert('File size exceeds 5000MB limit');
        return;
      }
      setFileUploadData({ ...fileUploadData, file });
    }
  };

  const submitFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileUploadData.file || !fileUploadData.projectId || !currentEmployee) {
      alert('Please fill all fields and select a file');
      return;
    }

    if (!hasSameClientAccess()) {
      alert('You do not have access to upload files for this client.');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileData = event.target?.result as string;
        const project = projects.find(p => p.id === fileUploadData.projectId);
        if (!project) {
          alert('Project not found');
          return;
        }

        const newFile: ClientPortalFile = {
          id: `file-${Date.now()}`,
          fileId: `file-${Date.now()}`,
          fileName: fileUploadData.file!.name,
          fileType: fileUploadData.file!.type,
          fileSize: fileUploadData.file!.size,
          fileData: fileData,
          siteId: project.siteId,
          description: fileUploadData.description,
          uploadedBy: currentEmployee.id,
          uploadedByName: currentEmployee.name,
          uploadedAt: new Date().toISOString(),
          clientName: clientName,
          versions: []
        };

        const filesRef = ref(database, `clients/${clientName}/files/${newFile.id}`);
        await set(filesRef, newFile);

        setFileUploadData({ projectId: '', description: '', file: null });
        setShowFileUpload(null);
        alert('File uploaded successfully!');
      };
      reader.readAsDataURL(fileUploadData.file);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    }
  };

  const getBlobUrlFromFileData = (fileData: string) => {
    try {
      const [header, base64] = fileData.split(',');
      const mimeMatch = header.match(/:(.*?);/);
      const mime = mimeMatch?.[1] || 'application/octet-stream';
      const binary = atob(base64 || fileData);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mime });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Failed to create blob URL:', error);
      return null;
    }
  };

  const downloadFile = (file: ClientPortalFile) => {
    if (!hasSameClientAccess()) {
      alert('You do not have access to download files for this client.');
      return;
    }

    const blobUrl = getBlobUrlFromFileData(file.fileData);
    if (!blobUrl) {
      alert('This file could not be downloaded.');
      return;
    }

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = file.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };

  const deleteFile = async (fileId: string) => {
    if (!currentEmployee || !hasSameClientAccess()) {
      alert('You do not have permission to delete files for this client.');
      return;
    }

    if (!canManageFiles()) {
      alert('Only managers can delete files');
      return;
    }

    if (!confirm('Delete this file permanently?')) return;

    try {
      const fileRef = ref(database, `clients/${clientName}/files/${fileId}`);
      await remove(fileRef);
      alert('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file');
    }
  };

  const canDeleteFile = () => {
    return canManageFiles();
  };

  const canViewEditFile = () => {
    return hasSameClientAccess();
  };

  const openFilePreview = (file: ClientPortalFile) => {
    if (!file.fileData) {
      alert('This file has no content to preview.');
      return;
    }

    const blobUrl = getBlobUrlFromFileData(file.fileData);
    if (!blobUrl) {
      alert('This file could not be previewed.');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(blobUrl);
    setShowFileViewer(true);
  };

  const handleFileReupload = async (fileId: string, newFile: File) => {
    if (!currentEmployee || !hasSameClientAccess()) {
      alert('You do not have access to edit files for this client.');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileData = event.target?.result as string;
        const existingFile = clientFiles.find(f => f.id === fileId);
        if (!existingFile) return;

        // Add version history
        const newVersion: ClientPortalFileVersion = {
          versionId: `v-${Date.now()}`,
          fileName: existingFile.fileName,
          fileData: existingFile.fileData,
          uploadedBy: existingFile.uploadedBy,
          uploadedByName: existingFile.uploadedByName,
          uploadedAt: existingFile.uploadedAt
        };

        const updatedFile: ClientPortalFile = {
          ...existingFile,
          fileName: newFile.name,
          fileData: fileData,
          uploadedBy: currentEmployee.id,
          uploadedByName: currentEmployee.name,
          uploadedAt: new Date().toISOString(),
          versions: [...(existingFile.versions || []), newVersion]
        };

        const fileRef = ref(database, `clients/${clientName}/files/${fileId}`);
        await update(fileRef, updatedFile);
        alert('File updated successfully!');
      };
      reader.readAsDataURL(newFile);
    } catch (error) {
      console.error('Error re-uploading file:', error);
      alert('Failed to re-upload file');
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('sheet')) return '📊';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('zip') || fileType.includes('compressed')) return '📦';
    return '📎';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading portal...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {clientIcons[clientName]} {clientName} Portal
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Manage sites and project files
              </p>
            </div>
          </div>
        </div>

        {/* Add Site Button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition shadow-md shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            Add Site
          </button>
        </div>

        {/* Add Site Form */}
        {showAddForm && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 mb-8 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Add New Site</h3>
            <form onSubmit={addProject} className="space-y-6">
              {/* Site Information */}
              <div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <span className="text-base">📍</span> Site Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Site ID (e.g., SITE-001)"
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newProject.siteId}
                    onChange={(e) => setNewProject({...newProject, siteId: e.target.value})}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Site Name"
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newProject.name}
                    onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                    required
                  />
                  <select
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newProject.status}
                    onChange={(e) => setNewProject({...newProject, status: e.target.value as any})}
                  >
                    <option value="active">Active</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on-hold">On Hold</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Location"
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newProject.location}
                    onChange={(e) => setNewProject({...newProject, location: e.target.value})}
                  />
                </div>
                <textarea
                  placeholder="Updates / Description"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none mt-4"
                  rows={2}
                  value={newProject.updates}
                  onChange={(e) => setNewProject({...newProject, updates: e.target.value})}
                />
              </div>

              {/* File Upload Section */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <span className="text-base">📁</span> Upload Files for This Site (Optional)
                </h4>
                <div className="border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-xl p-6 text-center mb-4">
                  <input
                    type="file"
                    id="siteFileInput"
                    multiple
                    accept=".jpg,.jpeg,.png,.xlsx,.docx,.pdf,.zip"
                    onChange={(e) => {
                      if (!e.target.files) return;
                      const files = Array.from(e.target.files);
                      const validated = files.filter((file) => {
                        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
                        if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_FORMATS.includes(file.type)) {
                          alert(`Skipped ${file.name} - Invalid format`);
                          return false;
                        }
                        if (file.size > 50 * 1024 * 1024) {
                          alert(`Skipped ${file.name} - Exceeds 50MB limit`);
                          return false;
                        }
                        return true;
                      });
                      setFilesToUploadWithSite(validated);
                    }}
                    className="hidden"
                  />
                  <label htmlFor="siteFileInput" className="cursor-pointer block">
                    <div className="text-4xl mb-2">📤</div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {filesToUploadWithSite.length > 0 
                        ? `${filesToUploadWithSite.length} file(s) selected`
                        : 'Click to select files or drag & drop'
                      }
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      JPG, PNG, EXCEL, WORD, PDF, ZIP (Max 50MB each)
                    </p>
                  </label>
                </div>

                {/* Files Preview */}
                {filesToUploadWithSite.length > 0 && (
                  <div className="space-y-3 mb-4">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Files to upload:</p>
                    {filesToUploadWithSite.map((file, idx) => (
                      <div key={idx} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-2xl">{getFileIcon(file.type)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{file.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFilesToUploadWithSite(filesToUploadWithSite.filter((_, i) => i !== idx));
                            const newDescriptions = { ...siteFileDescriptions };
                            delete newDescriptions[file.name];
                            setSiteFileDescriptions(newDescriptions);
                          }}
                          className="ml-2 p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition">
                  Create Site {filesToUploadWithSite.length > 0 ? `& Upload ${filesToUploadWithSite.length} File(s)` : ''}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setFilesToUploadWithSite([]);
                    setSiteFileDescriptions({});
                  }}
                  className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-6 py-2.5 rounded-xl text-sm font-bold transition hover:bg-slate-300 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Projects List */}
        {projects.length === 0 ? (
          <div className="text-center py-16 text-slate-500 dark:text-slate-400">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-lg font-semibold">No projects found</p>
            <p className="text-sm">Click "Add Site" to create your first project</p>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => {
              const projectFiles = clientFiles.filter(f => f.siteId === project.siteId);
              const isExpanded = expandedProjectId === project.id;

              return (
                <div key={project.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  {/* Project Header */}
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedProjectId(isExpanded ? null : project.id)}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
                          <div className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400">{project.siteId}</div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${statusColors[project.status]}`}>
                            {project.status}
                          </span>
                        </div>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{project.name}</h4>
                        <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                          <p>📍 {project.location || 'No location'}</p>
                          {project.updates && <p className="line-clamp-1">{project.updates}</p>}
                          <p className="text-xs">📁 {projectFiles.length} file(s)</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => deleteProject(project.id)}
                          className="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-950/50 transition flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded File Section */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 dark:border-slate-800 p-6 space-y-4 bg-slate-50 dark:bg-slate-800/50">
                      {/* Upload File Button */}
                      {canViewEditFile() && (
                        <button
                          onClick={() => setShowFileUpload(showFileUpload === project.id ? null : project.id)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition"
                        >
                          <Upload className="w-4 h-4" />
                          Upload File to This Site
                        </button>
                      )}

                      {/* File Upload Form */}
                      {showFileUpload === project.id && (
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800 space-y-3">
                          <input
                            type="text"
                            placeholder="File Description (optional)"
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                            value={fileUploadData.description}
                            onChange={(e) => setFileUploadData({...fileUploadData, description: e.target.value})}
                          />
                          <div className="border-2 border-dashed border-emerald-300 dark:border-emerald-700 rounded-lg p-4 text-center">
                            <input
                              type="file"
                              id={`fileInput-${project.id}`}
                              accept=".jpg,.jpeg,.png,.xlsx,.docx,.pdf,.zip"
                              onChange={(e) => {
                                if (!e.target.files) return;
                                const file = e.target.files[0];
                                if (file) {
                                  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
                                  if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_FORMATS.includes(file.type)) {
                                    alert('Invalid file format. Allowed: JPG, PNG, EXCEL, WORD, PDF, ZIP');
                                    return;
                                  }
                                  if (file.size > 5000 * 1024 * 1024) {
                                    alert('File size exceeds 5000MB limit');
                                    return;
                                  }
                                  setFileUploadData({ ...fileUploadData, projectId: project.id, file });
                                }
                              }}
                              className="hidden"
                            />
                            <label htmlFor={`fileInput-${project.id}`} className="cursor-pointer block">
                              <div className="text-2xl mb-1">📤</div>
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                {fileUploadData.file && fileUploadData.projectId === project.id
                                  ? fileUploadData.file.name
                                  : 'Click to select file'
                                }
                              </p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                                JPG, PNG, EXCEL, WORD, PDF, ZIP (Max 50MB)
                              </p>
                            </label>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={submitFileUpload}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition"
                            >
                              Upload
                            </button>
                            <button
                              onClick={() => {
                                setShowFileUpload(null);
                                setFileUploadData({ projectId: '', description: '', file: null });
                              }}
                              className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-lg text-xs font-bold transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Files List */}
                      {projectFiles.length === 0 ? (
                        <div className="text-center py-6 text-slate-500 dark:text-slate-400">
                          <p className="text-sm">No files uploaded yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {projectFiles.map((file) => (
                            <div key={file.id} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                              <div className="flex items-start justify-between gap-3 flex-wrap">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <div className="text-2xl flex-shrink-0">{getFileIcon(file.fileType)}</div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-900 dark:text-white text-sm break-words">{file.fileName}</p>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5 mt-1">
                                      <p>👤 {file.uploadedByName}</p>
                                      <p>📅 {new Date(file.uploadedAt).toLocaleDateString()} {new Date(file.uploadedAt).toLocaleTimeString()}</p>
                                      {file.description && <p>💬 {file.description}</p>}
                                      <p>📦 {(file.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                  {canViewEditFile() && (
                                    <>
                                      <button
                                        onClick={() => downloadFile(file)}
                                        className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-950/50 transition flex items-center gap-1 whitespace-nowrap"
                                      >
                                        <Download className="w-3 h-3" /> Download
                                      </button>
                                      <button
                                        onClick={() => openFilePreview(file)}
                                        className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-950/50 transition flex items-center gap-1 whitespace-nowrap"
                                      >
                                        <Eye className="w-3 h-3" /> View
                                      </button>
                                      <label className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-950/50 transition flex items-center gap-1 cursor-pointer whitespace-nowrap">
                                        <Edit2 className="w-3 h-3" /> Edit
                                        <input
                                          type="file"
                                          className="hidden"
                                          onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                              handleFileReupload(file.id, e.target.files[0]);
                                            }
                                          }}
                                          accept=".jpg,.jpeg,.png,.xlsx,.docx,.pdf,.zip"
                                        />
                                      </label>
                                    </>
                                  )}
                                  {canDeleteFile() && (
                                    <button
                                      onClick={() => deleteFile(file.id)}
                                      className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-950/50 transition flex items-center gap-1 whitespace-nowrap"
                                    >
                                      <Trash2 className="w-3 h-3" /> Delete
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Version History */}
                              {file.versions && file.versions.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">📋 Version History ({file.versions.length})</p>
                                  <div className="space-y-0.5 max-h-20 overflow-y-auto">
                                    {file.versions.map((v, idx) => (
                                      <div key={v.versionId} className="text-[9px] text-slate-500 dark:text-slate-500 p-1 bg-slate-100 dark:bg-slate-700/30 rounded flex justify-between items-center">
                                        <span>v{file.versions!.length - idx} - {v.uploadedByName}</span>
                                        <span>{new Date(v.uploadedAt).toLocaleDateString()}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* File Viewer Modal */}
        {showFileViewer && selectedFile && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
              <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">{selectedFile.fileName}</h3>
                <button
                  onClick={() => {
                    if (previewUrl) {
                      URL.revokeObjectURL(previewUrl);
                    }
                    setPreviewUrl(null);
                    setShowFileViewer(false);
                    setSelectedFile(null);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                {selectedFile.fileType.includes('image') && previewUrl && (
                  <img src={previewUrl} alt={selectedFile.fileName} className="max-w-full h-auto rounded-lg" />
                )}
                {selectedFile.fileType.includes('pdf') && previewUrl && (
                  <iframe src={previewUrl} title={selectedFile.fileName} className="w-full h-[32rem] rounded-lg border-0" />
                )}
                {(selectedFile.fileType.includes('sheet') || selectedFile.fileType.includes('word')) && (
                  <div className="text-center p-12 text-slate-500 dark:text-slate-400">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Preview not available for this file type</p>
                    <button
                      onClick={() => downloadFile(selectedFile)}
                      className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold"
                    >
                      Download to View
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}